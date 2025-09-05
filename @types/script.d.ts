declare enum InitializeResponseEnum {
  CUSTOM_CHOICE_DISABLED,
  ACCESS_GRANTED,
  ACCESS_NOT_GRANTED,
}

interface Window {
  googlefc: {
    offerwall: {
      customchoice: {
        InitializeResponseEnum: typeof InitializeResponseEnum;
        registry: WebMonetizationCustomOfferwallChoice;
      };
    };
  };
  googletag?: {
    cmd?: (() => void)[];
    enableServices?: () => void;
  };
}

interface GlobalEventHandlersEventMap {
  monetization: MonetizationEvent;
}

interface InitializeParams {
  offerwallLanguageCode?: string;
}

declare class MonetizationEvent extends Event {
  amountSent: { value: string; currency: string };
  paymentPointer: string;
  incomingPayment: string;
}
