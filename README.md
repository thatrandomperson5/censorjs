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
There are two main parts to the Censor process:
* The censored instance or class (eg. `WebSocket` or `window`)
* The censoring object (The `CensorObject` or `CensorClass` instance)
  
All censor handles applied via the censoring object will directly and permenantly affect the censored instance. 
You can think of the censoring object as a interface that allows for easy creation of censor handles, 
not directly connected to any handles themselves. 

### Instance vs. Class
Before you continue, you should know the difference between censoring a instance vs. a class. 
When you censor a instance, you replace current and future calls and triggers with glorified wrappers that handle it your way 
before passing back to the original. 
Censoring a class simply designates a initilization function so that when anyone creates a new instance of that class, 
it automatically comes with a censor on that instance. 
You can think of this as a "group" of sorts so that you can apply one set of handles to any object of your choice.

### Basic Usage of the Censoring Object
The simplest, reccommended way of creating a censoring object is using the `censor` function.
```js
var windowCensor = censor(window)
var webSocketCensor = censor(WebSocket)
```
You can also directly create the classes, but that makes inline chains more difficult (eg. `censor(something).first().second()`)
```js
var windowCensor = new CensorObject(window)
var webSocketCensor = new CensorClass(WebSocket)
```
Instance censors are implemented automatically, whereas class censors must be manually set in a scope (usually global). (Automatic implementation coming soon)
```
WebSocket = webSocketCensor.genFunc() // Implement your class censoring 
```
### Censoring Functions
| Name | Description | Pass/Next Effect | Step Graph |
|---|---|---|---|
| `.whenCall(name, handle)` | Register a handle that is called instead whenever `name` is called. | Call the original function behind `name` | Outside Call -> Handle -> Original Function -> Handle Return |
| `.whenAttr(name, handles)` | Sets a custom setter and getter for attribute with `name`. (NO CTX PROVIDED YET) | Not currently implemented, coming soon | Outside Set/Get -> Handle |
| `on(event, handle)` | A event intercepter that intercepts all event handles of the event `event` | Call the original handle function. | Event Triggered -> Handle -> Original Handle -> Handle Return |

### Handles
Censor handles are constructed very similarly to the orignal handle/function with exception of the ctx object as the first object.
* You have the option of making a handle a complete replacement of the original by not using ctx. 
* Your ways of interacting with the original are calling `.next(...args)` or `.pass` which passes argument automatically.

The general structure goes something like this:
```js
(ctx) => {
  ctx.args.modify() // Change it to your wish
  var result = ctx.pass()
  result.modify() // Change the result
  return result;
}
```

### Async
The `whenCall` function supports async handles. These will should be used when the original function is async and can be enabled by passing `async (ctx, arg1) => {doSomething}` as a handler.
