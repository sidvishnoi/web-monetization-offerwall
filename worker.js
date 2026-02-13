const html = String.raw;

export default {
  async fetch(request) {
    const { pathname, searchParams } = new URL(
      request.url,
      "http://example.com",
    );

    if (pathname !== "/tool") {
      return new Response("Not Found", { status: 404 });
    }

    const html = getToolMarkup(searchParams);
    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
};

/**
 * @param {URLSearchParams} params
 * @returns {string}
 */
function getToolMarkup(params) {
  let src = params.get("src") || "";
  let walletAddress = params.get("wa") || "";
  let profileId = params.get("profile") || "";

  if (src === "staging" || src === "production" || Number(src)) {
    // ok src
  } else {
    src = "";
  }

  try {
    const url = new URL(walletAddress);
    if (url.protocol !== "https:") {
      throw new Error("Invalid wallet address");
    }
  } catch (error) {
    walletAddress = "";
  }

  if (["version1", "version2", "version3"].includes(profileId)) {
    // ok profileId
  } else {
    profileId = "";
  }

  let script = "";
  if (src && walletAddress && profileId) {
    const prefix =
      src === "production" ? "" : src === "staging" ? "staging-" : `pr${src}-`;
    const baseUrl = `https://${prefix}publisher-tools-cdn.webmonetization.workers.dev`;
    const url = new URL("/offerwall.js", baseUrl);

    script = `<script id="wmt-offerwall-init-script" type="module" src="${url}" data-wallet-address="https://ilp.interledger-test.dev/sid" data-tag="version1"></script>`;
  }

  return base({
    head: html`
      <script
        async
        src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        crossorigin="anonymous"
      ></script>
      ${script}
    `,

    body: renderForm({ src, walletAddress, profileId }),
  });
}

const renderForm = ({ src, walletAddress, profileId }) => html`
  <form action="/tool" method="GET">
    <div>
      <label>
        <span>Script source:</span>
        <input
          name="src"
          value="${src}"
          type="text"
          list="src-options"
          required
          pattern="staging|production|[0-9]+"
        />
      </label>
      <datalist id="src-options">
        <option value="staging" />
        <option value="production" />
      </datalist>
      <p>
        One of the following: <code>staging</code>, <code>production</code>, or
        a Pull Request Number (e.g. <code>1234</code>).
      </p>
    </div>

    <div>
      <label>
        <span>Wallet address:</span>
        <input name="wa" required value="${walletAddress}" type="url" />
      </label>
      <p>Full wallet address URL</p>
    </div>

    <div>
      <label>
        <span>Profile ID:</span>
        <select name="profile" required>
          ${["version1", "version2", "version3"].map(
            e =>
              html`<option value="${e}" ${profileId === e ? "selected" : ""}>
                ${e}
              </option>`,
          )}
        </select>
      </label>
      <p>Offerwall profile ID</p>
    </div>

    <button type="submit">Show preview</button>
  </form>
`;

const base = ({ head, body }) => html`
  <html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Publisher tools Offerwall demo</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            padding: 1rem;
          }

          form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            max-width: 600px;
            flex-wrap: wrap;

            label {
              font-weight: bold;
              display: flex;
              gap: 0.2rem;
            }

            input {
              flex-grow: 1;
            }

            > div {
              border: 1px solid #ccc;
              border-radius: 5px;
              padding: 0.5rem;

              p {
                margin: 0.2rem 0;
                font-size: smaller;
              }
            }

            button {
              cursor: pointer;
              background: navy;
              color: #fff;
              border: none;
              width: fit-content;
              border-radius: 5px;
              padding: 0.5rem 1rem;
              font-size: 1.2rem;
            }
          }
        </style>
        ${head}
      </head>
      <body>
        <h1>Publisher tools Offerwall demo</h1>
        ${body}
      </body>
    </html>
  </html>
`;
