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
 */
class CensorCallContext extends CensorContext {
  next(...args) {
    return this.parent.call(this.name, ...args)
  }
}

/**
 * The main Censor class. Applies censor effects to any object, and effects are independent of the Censor class object.
 * @class
 * @constructor
 * @public
 */
class CensorObject {
  /**
   * The main callback function type. Remember to always call {@link CensorContext#pass} or {@link CensorContext#next} within but not both.
   * @callback genericHandle
   * @param {CensorContext|CensorCallContext} ctx - The passed context.
   * @param {...*} var_args - Any number of arguments passed to the context.
   * @returns {*} - The result you want to be passed to the original.
   *
   */

  /**
   * Reference to the original object.
   * @type {Object}
   * @public
   */
  object
  #eventHandleCache

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
    this.object = object
    this.#eventHandleCache = {}
  }

  // Functions

  /**
   * Call the base function from base object with name and args.
   * @private
   * @param {string} name - The name of the function.
   * @param {...*} args - Arguments to pass.
   * @returns {*} - The function result
   */
  call(name, ...args) {
    if (!this.object.hasOwnProperty("_CENSOR_" + name)) {
      throw new TypeError('Unregistered function binding for "' + name + '"')
    }
    return this.object["_CENSOR_" + name](...args)
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

    var ctx = new CensorCallContext(this, name)
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
   * @param {PropertyDescription} handles - The handler functions. (generic JS callback, only accepts get and set)
   * @returns {CensorObject} - Returns self for chaining.
   */
  whenAttr(name, handles) {
    CensorObject.typeCheck(name, "string")
    CensorObject.typeCheck(handles, "object")

    let description = CensorObject.getPropertyDescriptor(this.object, name)
    this.object["_CENSOR_set_" + name] = description["set"]
    this.object["_CENSOR_get_" + name] = description["get"]
    let originalObject = this.object

    var desc = {}
    if (handles.hasOwnProperty("get")) {
      desc["get"] = () => {
        return handles["get"](originalObject["_CENSOR_get_" + name]())
      }
    }
    if (handles.hasOwnProperty("set")) {
      desc["set"] = (asgn) => {
        originalObject["_CENSOR_set_" + name](handles["set"](asgn))
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
    this.#eventHandleCache[event] = handle

    this.whenAttr("on" + event, {
      set: (internal) => {
        return (...args) => {
          var ctx = new CensorContext(topLevelObj, event)
          ctx.callback = internal
          ctx.args = args
          return handle(ctx, ...args)
        }
      },
    })
    this.object.onclick = prev // apply to old onclick attribute
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
 * Practiaclly identical function-wise to {@link CensorObject}, used to censor uninitiated classes. The `genFunc` function listed below is the only unique function of this class.
 * @class
 * @constructor
 * @public
 */
class CensorClass {
  cls
  #eventHandles
  #callHandles
  #attrHandles

  /**
   * Create a CensorClass object
   * @param {function(...*):Object} cls - The class descriptor function.
   */
  constructor(cls) {
    this.cls = cls
    this.#eventHandles = {}
    this.#callHandles = {}
    this.#attrHandles = {}
  }

  whenCall(name, handle) {
    this.#callHandles[name] = handle
  }
  whenAttr(name, handles) {
    this.#attrHandles[name] = handles
  }
  on(name, handle) {
    this.#eventHandles[name] = handle
  }

  /**
   * Generate a class initalization function to be used as a replacement. 
   * @example 
   * var webSocketCensor = censor(WebSocket)
   * // censor stuff
   * WebSocket = webSocketCensor.getFunc()
   * @returns {function(...*):Object} - Returns a valid initalization function.
   */
  genFunc() {
    let originalObject = this
    return function (...args) {
      var result = new originalObject.cls(...args)
      var resultCensor = new CensorObject(result)

      for (const [key, value] of Object.entries(originalObject.#callHandles)) {
        resultCensor.whenCall(key, value)
      }
      for (const [key, value] of Object.entries(originalObject.#attrHandles)) {
        resultCensor.whenAttr(key, value)
      }
      for (const [key, value] of Object.entries(originalObject.#eventHandles)) {
        resultCensor.on(key, value)
      }

      return result
    }
  }
}

/**
 * Properly censor the given object if able
 * @param {*} obj - The object given as a base.
 * @returns {CensorObject|CensorClass} - The Censor object used to apply handles.
 */
function censor(obj) {
  if (typeof obj === "object") {
    return new CensorObject(obj)
  } else if (obj instanceof Object) {
    return new CensorClass(obj)
  } else {
    throw new TypeError("Can't install censor on " + typeof obj)
  }
}
\n export {censor, CensorObject}
