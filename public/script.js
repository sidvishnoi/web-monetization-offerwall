// @ts-check
import { sleep, withResolvers, html } from "./utils.js";

const RETRIES = 8;
const TIMEOUT = 3 * 1000;

export class WebMonetizationCustomOfferwallChoice {
  /**
   * Stores monetization events during session duration.
   *
   * We can serialize them to localStorage and reuse existing events on
   * subsequent page loads, to prevent user from paying when we're ok with
   * existing payments received.
   * @type {MonetizationEvent[]}
   */
  #monetizationEvents = [];

  /**
   * Initialize your custom choice, which may include loading or preparing any
   * resources required to function.
   * @param {InitializeParams} params
   * @return {Promise<InitializeResponseEnum>}
   */
  async initialize(params) {
    window.addEventListener("monetization", ev => {
      this.#monetizationEvents.push(ev);
    });

    // If your custom choice is inoperable on this page, return
    // CUSTOM_CHOICE_DISABLED, causing your Offerwall to exclude the custom
    // choice option when rendering.
    if (!this.supportsWebMonetization()) {
      return window.googlefc.offerwall.customchoice.InitializeResponseEnum
        .CUSTOM_CHOICE_DISABLED;
    }

    // If the user should automatically be granted page access on page load,
    // return ACCESS_GRANTED, causing your Offerwall to be ineligible to render
    // on this page.
    const isAccessGranted = await this.shouldUserBeGrantedPageAccess();
    if (isAccessGranted) {
      return window.googlefc.offerwall.customchoice.InitializeResponseEnum
        .ACCESS_GRANTED;
    }

    // If the user shouldn't automatically be granted page access on page load,
    // return ACCESS_NOT_GRANTED, causing your Offerwall to be eligible to
    // render on this page.
    return window.googlefc.offerwall.customchoice.InitializeResponseEnum
      .ACCESS_NOT_GRANTED;
  }

  /**
   * Show your custom choice on the web page, which may be a subscription service, micropayments service, rewarded ad, etc.
   * @returns {Promise<boolean>}
   */
  async show() {
    const dialog = document.createElement("dialog");
    dialog.id = "wm-custom-offerwall";

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    const abort = new AbortController();
    cancelButton.addEventListener(
      "click",
      () => {
        dialog.close();
        abort.abort();
      },
      { once: true }
    );

    window.addEventListener("monetization", event => {
      this.#monetizationEvents.push(event);
    });

    const p = document.createElement("p");
    p.innerHTML = WebMonetizationCustomOfferwallChoice.messages["waiting"];

    const meter = Object.assign(document.createElement("meter"));
    meter.min = 0;
    meter.max = RETRIES;
    meter.value = RETRIES;

    dialog.appendChild(cancelButton);
    dialog.appendChild(p);
    dialog.appendChild(meter);
    document.body.appendChild(dialog);

    dialog.showModal();

    let attempt = 0;
    while (!abort.signal.aborted && attempt < RETRIES) {
      p.innerHTML = WebMonetizationCustomOfferwallChoice.messages["waiting"];
      meter.value = RETRIES - attempt;
      ++attempt;

      if (this.#monetizationEvents.length) {
        const ev = this.#monetizationEvents.find(ev => this.isOkEvent(ev));
        if (ev) {
          p.textContent =
            WebMonetizationCustomOfferwallChoice.messages["verifying"];
          const isVerified = await this.isVerifiedPayment(ev);
          if (isVerified) {
            dialog.close();
            return isVerified;
          }
        }
      }

      /** @type {ReturnType<typeof withResolvers<MonetizationEvent>>} */
      const { resolve, promise, reject } = withResolvers();
      window.addEventListener("monetization", resolve, { once: true });
      abort.signal.addEventListener("abort", reject);

      const timeout = sleep(TIMEOUT);

      try {
        if (!(await Promise.race([promise, timeout]))) {
          continue;
        }
        const event = this.getMonetizationEvent();
        if (!event) {
          continue;
        }
        p.textContent =
          WebMonetizationCustomOfferwallChoice.messages["verifying"];
        const isVerified = await this.isVerifiedPayment(event);
        if (isVerified) {
          dialog.close();
          return isVerified;
        }
        p.textContent =
          WebMonetizationCustomOfferwallChoice.messages["verification_failed"];
        await sleep(1000);
      } catch (error) {
        if (error instanceof DOMException) {
          if (error.name === "AbortError") {
            p.textContent = "Aborted by user";
            return false;
          } else {
            p.textContent = error.message;
          }
        } else {
          p.textContent =
            error instanceof Error ? error.message : String(error);
          return false;
        }
      }
    }

    p.innerHTML = WebMonetizationCustomOfferwallChoice.messages["timeout"];
    meter.value = 0;
    cancelButton.textContent = "Close";
    return false;
  }

  async shouldUserBeGrantedPageAccess() {
    const ev = this.getMonetizationEvent();
    if (!ev) return false;
    return await this.isVerifiedPayment(ev);
  }

  getMonetizationEvent() {
    return this.#monetizationEvents.findLast(ev => this.isOkEvent(ev));
  }

  supportsWebMonetization() {
    /** @type {HTMLLinkElement | null} */
    const link = document.querySelector('link[rel="monetization"]');
    if (link) {
      return link.relList.supports("monetization");
    }
    return false;
  }

  /**
   * @param {Event} ev
   */
  isOkEvent(ev) {
    if (!(ev instanceof MonetizationEvent)) {
      return false;
    }
    return Number(ev.amountSent.value) > 0;
  }

  /**
   * Check if the MonetizationEvent has a valid incomingPayment.
   *
   * Can use a verifier service in backend to verify, but fetching the
   * incomingPayment is enough here.
   * @param {MonetizationEvent} ev
   */
  async isVerifiedPayment(ev) {
    if (!ev.incomingPayment) return false;
    try {
      const res = await fetch(ev.incomingPayment);
      if (!res.ok) return false;
      return true;
    } catch (error) {
      return false;
    }
  }

  static messages = {
    waiting: html`Waiting for a <code>MonetizationEvent</code>...`,
    verifying: `Verifying payment...`,
    verification_failed: `Verification failed`,
    timeout: html`Timed out waiting for a <code>MonetizationEvent</code>`,
  };
}
