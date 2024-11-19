/**
 * The main module of the Censor library. Contains all core features.
 * @module Censor
 * @example
 * censor(window).whenCall("fetch", async (ctx) => {
 *   console.log(ctx.args) // Log the arguments passed to fetch
 *   var result = await ctx.pass() // Run the original fetch function
 *   console.log(result.status) // Log the result status
 *   return result // Pass the response
 * }).on("load", (ctx, event) => {
 *   console.log("loaded")  // Signifiy that the event was run
 *   return ctx.pass() // Run the original handler
 * })
 *
 *  fetch("https://echo.zuplo.io").catch((error) => {
 *    console.error(error.message)
 *  })
 */

/**
 * See [mozilla documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#description).
 * @typedef {Object} PropertyDescription
 * @property {bool} [configurable]
 * @property {bool} [enumerable]
 * @property {*} [value]
 * @property {bool} [writable]
 * @property {function():void} [get]
 * @property {function(*):void} [set]
 */

/**
 * A class for providing context and interaction within the Censor handle.
 * @class
 * @constructor
 * @public
 */
class CensorContext {
  /**
   * Arguments that are passed to the context when. Usually function arguments.
   * @type {*[]}
   * @public
   */
  args
  /**
   * The connected Censor object.
   * @type {CensorObject}
   * @public
   */
  parent

  /**
   * The "original" based on situation.
   * @type {function(...*):*}
   * @public
   */
  callback

  /**
   * Create a context object. (Not for general use)
   * @param {CensorObject} parent - The connected Censor object.
   * @param {string} name - The name of the attribute, function, or event that is currently connected.
   */
  constructor(parent, name) {
    CensorObject.typeCheck(name, "string")
    this.parent = parent
    this.name = name
  }

  /**
   * Run the original function. Run after modifications to input but before output.
   * @param {...*} args - Modified arguments to pass to the original function.
   * @returns {*} - The result of the original function.
   */
  next(...args) {
    return this.callback(...args)
  }

  /**
   * Run the original function. Run after modifications to input but before output. (Automatically passes arguments from context)
   * @returns {*} - The result of the original function.
   */
  pass() {
    return this.next(...this.args)
  }
}

/**
 * A class for providing context and interaction within the Censor handle.
 * @class
 * @public
 * @deprecated - since 0.1.1
 */
class CensorCallContext extends CensorContext {
  next(...args) {
    return this.parent.call(this.name, ...args)
  }
}

/**
 * The main callback function type. Note that the effects of `.pass()`/`.next()` change based om where the context was assigned from. ([See Pass/NextEffect](https://github.com/thatrandomperson5/censorjs/tree/main?tab=readme-ov-file#censoring-functions))
 * @callback genericHandle
 * @param {CensorContext|CensorCallContext} ctx - The passed context.
 * @param {...*} var_args - Any number of arguments passed to the context.
 * @returns {*} - The result you want to be passed to the original.
 */

/**
 * The main Censor class. Applies censor effects to any object, and effects are independent of the Censor class object.
 * @class
 * @constructor
 * @public
 */
class CensorObject {
  /**
   * Reference to the original object.
   * @type {Object}
   * @public
   */
  object

  /**
   * A type assertion util based on `typeof`
   * @param {Object} obj - The object to test,
   * @param {string} typ - The expected type.
   */
  static typeCheck(obj, typ) {
    if (typeof obj !== typ) {
      throw new TypeError("Got " + typeof obj + " expected " + typ)
    }
  }

  /**
   * A recursive version of `getOwnPropertyDescriptor`, searching the inheritance tree.
   * @param {Object} obj - The object to search.
   * @param {string} name - The name of the property to retrive.
   * @param {number} [maxdepth=10] - The maximum search depth.
   * @returns {PropertyDescription} - The found property descriptor.
   */
  static getPropertyDescriptor(obj, name, maxdepth = 10) {
    var current = obj
    var depth = 0
    while (obj.constructor !== Object && depth <= maxdepth) {
      if (obj.hasOwnProperty(name)) {
        return Object.getOwnPropertyDescriptor(obj, name)
      }
      depth += 1
      obj = Object.getPrototypeOf(obj)
    }
    return null
  }

  /**
   * Create a Censor object
   * @param {Object} object - The base object.
   */
  constructor(object) {
    CensorObject.typeCheck(object, "object")
    this.object = object
  }

  // Functions

  /**
   * Call the base function from base object with name and args.
   * @param {string} name - The name of the function.
   * @param {...*} args - Arguments to pass.
   * @returns {*} - The function result
   */
  call(name, ...args) {
    return this.object["_CENSOR_" + name](...args) // Required because certain functions can only be called from the right class
  }

  /**
   * Call the base getter for name from base object.
   * @param {string} name - The name of the attribute.
   * @returns {*} - The value that was originally returned.
   */
  getAttr(name) {
    return this.object["_CENSOR_get_" + name]() // Required because certain functions can only be called from the right class
  }

  /**
   * Call the base setter for name from base object.
   * @param {string} name - The name of the attribute.
   * @param {*} asgn - Object to assign.
   */
  setAttr(name, asgn) {
    this.object["_CENSOR_set_" + name](asgn) // Required because certain functions can only be called from the right class
  }

  /**
   * Register a handle for when function with name is called from base object
   * @param {string} name - The name of the function.
   * @param {genericHandle} handle - The handler function.
   * @returns {CensorObject} - Returns self for chaining.
   */
  whenCall(name, handle) {
    CensorObject.typeCheck(name, "string")
    CensorObject.typeCheck(this.object[name], "function")
    CensorObject.typeCheck(handle, "function")
    if (!this.object.hasOwnProperty("_CENSOR_" + name)) {
      this.object["_CENSOR_" + name] = this.object[name] // Override old hooks
    }

    var ctx = new CensorContext(this, name)
    ctx.callback = (...args) => {
      return this.call(name, ...args)
    }
    var f
    if (handle[Symbol.toStringTag] === "AsyncFunction") {
      f = async (...args) => {
        ctx.args = args
        return await handle(ctx, ...args)
      }
    } else {
      f = (...args) => {
        ctx.args = args
        return handle(ctx, ...args)
      }
    }
    this.object[name] = f
    return this // For conjoining, eg. censor(obj).whenCall(...).on(...).whenAttr(...)
  }

  // Attributes

  /**
   * Register a handle for when a attribute with name is modified or retrived from base object
   * @param {string} name - The name of the function.
   * @param {Object} handles - The handler functions.
   * @param {genericHandle} [handles.get] - The get handler for the attribute.
   * @param {genericHandle} [handles.set] - The set handler for the attribute.
   * @returns {CensorObject} - Returns self for chaining.
   */
  whenAttr(name, handles) {
    CensorObject.typeCheck(name, "string")
    CensorObject.typeCheck(handles, "object")

    let description = CensorObject.getPropertyDescriptor(this.object, name)
    this.object["_CENSOR_set_" + name] = description["set"]
    this.object["_CENSOR_get_" + name] = description["get"]
    let originalObject = this

    var desc = {}
    var context = new CensorContext(this, name)

    if (handles.hasOwnProperty("get")) {
      desc["get"] = () => {
        context.args = []
        context.callback = () => originalObject.getAttr(name)
        return handles["get"](context)
      }
    }
    if (handles.hasOwnProperty("set")) {
      desc["set"] = (asgn) => {
        context.args = [asgn]
        context.callback = (_asgn) => originalObject.setAttr(name, _asgn)

        handles["set"](context, asgn)
      }
    }

    Object.defineProperty(this.object, name, desc)
    return this // For conjoining, eg. censor(obj).whenCall(...).on(...).whenAttr(...)
  }

  // Events

  /**
   * Register a handle for when a event is triggered and responded to from base object
   * @param {string} event - The name of the event.
   * @param {genericHandle} handle - The handle the will be applied to all listeners.
   * @returns {CensorObject} - Returns self for chaining.
   */
  on(event, handle) {
    CensorObject.typeCheck(event, "string")
    CensorObject.typeCheck(handle, "function")

    let topLevelObj = this
    let prev = this.object["on" + event]
    let prevAdd = this.object.addEventListener

    this.whenAttr("on" + event, {
      set: (ctx, internal) => {
        ctx.next((...args) => {
          var ctx = new CensorContext(topLevelObj, event)
          ctx.callback = internal
          ctx.args = args
          return handle(ctx, ...args)
        })
      },
    })
    this.object["on" + event] = prev // apply to old attribute
    this.whenCall("addEventListener", (ctx, type, listener, other) => {
      var newCtx = new CensorContext(topLevelObj, event)
      newCtx.callback = listener
      ctx.next(
        type,
        (...args) => {
          newCtx.args = args
          return handle(newCtx, ...args)
        },
        other,
      )
    })
    return this // For conjoining, eg. censor(obj).whenCall(...).on(...).whenAttr(...)
  }
}

/**
 * Very similar to {@link CensorObject}, used to censor uninitiated classes on initiation. The `genFunc` and `apply` functions listed below is the only unique functions of this class. `whenCall`, `whenAttr` and `on` are all directly equivilent to their {@link CensorObject} counterparts.
 * @class
 * @constructor
 * @public
 */
class CensorClass {
  cls
  /**
   * The name of the passed class or the given name
   * @public
   * @type {string}
   */
  name
  #eventHandles
  #callHandles
  #attrHandles

  /**
   * Create a CensorClass object
   * @param {function(...*):Object} cls - The class descriptor function.
   * @param {string|null} [accessName=null] - The name this class is accessed by publicly. (For example, `WebSocket` is internally named `E`, so this would be needed)
   * @param {Object|null} [implementOn=window] - The object to automatically implement the result `genFunc()` onto.
   */
  constructor(cls, accessName=null, implementOn=window) {
    CensorObject.typeCheck(cls, "function")
    this.cls = cls
    this.name = accessName ?? cls.name
    this.#eventHandles = {}
    this.#callHandles = {}
    this.#attrHandles = {}
    if (implementOn !== null) {
      implementOn[this.name] = this.genFunc()
    }
  }

  whenCall(name, handle) {
    this.#callHandles[name] = handle
    return this
  }
  whenAttr(name, handles) {
    this.#attrHandles[name] = handles
    return this
  }
  on(name, handle) {
    this.#eventHandles[name] = handle
    return this
  }

  /**
   * Apply all censor handles to a instance of the given class.
   * @param {Object} obj - A instance of the given class or any other fitting object.
   * @returns {CensorClass} - Returns self for chaining.
   */
  apply(obj) {
    var c = new CensorObject(obj)

    for (const [key, value] of Object.entries(this.#callHandles)) {
      c.whenCall(key, value)
    }
    for (const [key, value] of Object.entries(this.#attrHandles)) {
      c.whenAttr(key, value)
    }
    for (const [key, value] of Object.entries(this.#eventHandles)) {
      c.on(key, value)
    }
    return this
  }

  /**
   * Generate a class initalization function to be used as a replacement.
   * @example
   * var webSocketCensor = censor(WebSocket, null, null)
   * // censor stuff
   * WebSocket = webSocketCensor.getFunc()
   * @returns {function(...*):Object} - Returns a valid initalization function.
   */
  genFunc() {
    let originalObject = this
    return function (...args) {
      var result = new originalObject.cls(...args)
      originalObject.apply(result)
      return result
    }
  }
}

/**
 * Properly censor the given object if able
 * @param {*} obj - The object given as a base.
 * @param {...*} options - Options to pass to the Censor constructor.
 * @returns {CensorObject|CensorClass} - The Censor object used to apply handles.
 */
function censor(obj, ...options) {
  if (typeof obj === "object") {
    return new CensorObject(obj, ...options)
  } else if (obj instanceof Object) {
    return new CensorClass(obj, ...options)
  } else {
    throw new TypeError("Can't install censor on " + typeof obj)
  }
}
