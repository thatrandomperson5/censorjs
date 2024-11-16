# Censor
A event &amp; call interception library for javascript. Censor monkeypatches your custom handles to any existing object or class' functions, attributes and events. 

Here is an example of intercepting all proceeding fetch requests and load events:
```js
censor(window).whenCall("fetch", async (ctx) => {
  console.log(ctx.args) // Log the arguments passed to fetch

  var result = await ctx.pass() // Run the original fetch function
  console.log(result.status) // Log the result status

  return result // Pass the response
}).on("load", (ctx, event) => {
  console.log("loaded")  // Signifiy that the event was run
  return ctx.pass() // Run the original handler
})

 fetch("https://echo.zuplo.io").catch((error) => {
   console.error(error.message)
 })
```

## Links
* [Docs](https://thatrandomperson5.github.io/censorjs/)
## Installation
```js
import { censor } from "https://cdn.jsdelivr.net/gh/thatrandomperson5/censorjs@master/release/censor.module.min.js"
```
or
```html
<script src="https://cdn.jsdelivr.net/gh/thatrandomperson5/censorjs@master/release/censor.min.js"></script>
```
## Usage
TODO
