# 0.1.0
* Added CensorObject and CensorClass to add handlers to classes and instances
* Added censor function to simplfiy creation of said objects
* Added interceptors for: function calls, events, attribute gets and attribute sets by passing a name and handler
* Added CensorContext to pass to handlers. Contains original arguments along with functions that will call the original functions to complete actions.
* Added Documentation
* Added automations for minification and documentation

# 0.1.1
* Documentation and automation overhaul. (Made all tags accessible via docs)
* Added context for get and set handlers 
* Rework of the context system (callbacks that required direct attachment had created the need for the CensorCallContext subclass, but we have now replaced those with inline functions)
* Added base call, set and get utilities
* Upgraded documentation and deprecated CensorCallContext
* Cleaned legacy properties from beta versions
