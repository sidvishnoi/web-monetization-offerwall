# Web Monetization + Offerwall

This is an experiment to integrate [Web Monetization](https://webmonetization.org) API with [Google's Offerwall](https://support.google.com/admanager/answer/13860694), using Offerwall's Custom Choice API.

## How it works

In the `initialize()` step, we check if the browser supports Web Monetization. If it doesn't, we return `CUSTOM_CHOICE_DISABLED` and no custom choice Offerwall option is shown.

Next, we check if we have an existing MonetizationEvent by the time `initialize` was called. If there is, very verify the payment, and on success, return `ACCESS_GRANTED` so user can directly access the page.

Otherwise, we return `ACCESS_NOT_GRANTED` and the custom choice Offerwall is shown (via the `show()` method).

In `show()`, we wait up to `TIMEOUT` milliseconds for a valid `MonetizationEvent` to be emitted. We do this polling `RETRIES` times before timing out and returning `false`, instead of waiting indefinitely (for demo purposes).

In the UI, we show a modal `<dialog>` with a `<meter>` that displays timeout progress, along with some text. The dialog element ensures user cannot access the content until we `show()` returns a `true` value.
