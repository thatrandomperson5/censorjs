/** The link to the censor CDN, can be used in `options.resources` */
const censorResource = "https://cdn.jsdelivr.net/gh/thatrandomperson5/censorjs@master/release/censor.min.js"

/**
 * A hash function taken from [here](https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
 * @param {string} str - The string to hash
 * @param {number} [seed=0] - The seed to base the hash
 * @returns {number} - The hash
 */
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

/**
 * The callback type for softRefresh
 * @callback softRefreshCallback
 * @param {Object} [pass] - An object you can pass to the callback through the `pass` option
 */


/**
 * Refresh a webpage with a handle the executes before any original code execution.
 * @param {softRefreshCallback} handle - The handle to execute.
 * @param {Object} [options={}] - The options object.
 * @param {Object} [options.pass] - A json serializable object to pass to the handle after load.
 * @param {{URL|string}[]} [options.resources] - A list of links to libraries or other resources you want avalible in your handle.
 * @param {function(Document)} [options.processer] - Any custom operations on the document before the soft refresh.
 * @paran {bool} [options.useCurrentState] - Use current html instead of fetching default.
 * @returns {Promise} - The promise that resolves the function.
 */
async function softRefresh(handle, options = {}) {
  const parser = new DOMParser()
  var docHTML
  if (options.useCurrentState) {
    docHTML = document.documentElement.outerHTML
  } else {
    docHTML = await (await fetch(window.location.href)).text()
  }
  var newDocument = parser.parseFromString(
    docHTML,
    "text/html",
  )

  let handleScript = newDocument.createElement("script") // The inserted script
  if (options.hasOwnProperty("pass")) { // Insert script and options.pass if given
    handleScript.textContent =
      "(" + handle.toString() + `)(${JSON.stringify(options.pass)})`
  } else {
    handleScript.textContent = "(" + handle.toString() + ")()"
  }
  handleScript.id = "softRefresh-handle-" + cyrb53(handle.toString())
  newDocument.head.prepend(handleScript)

  if (Array.isArray(options.resources)) {  // load resources
    for (const resource of options.resources.reverse()) {
      var url, r
      if (resource instanceof URL) {
        url = resource
      } else {
        url = new URL(resource)
      }
      if (url.pathname.endsWith(".css")) {
        r = newDocument.createElement("style")
      } else {
        r = newDocument.createElement("script")
      }

      let resp = await fetch(url) // fetch
      if (!resp.ok) {
        throw new ValueError("Can't fetch resource at " + url.toString())
      }
      r.textContent = await resp.text()
      r.id = "softRefresh-resource-" + cyrb53(url)
      newDocument.head.prepend(r)
    }
  }

  if (typeof options.processor === "function") {
    options.processor(newDocument) // process
  }

  let html =
    "<!doctype html>\n<html>\n" +
    newDocument.documentElement.innerHTML +
    "\n</html>"
  document.write(html)
}
