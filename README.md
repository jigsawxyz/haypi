# haypi
#### A set of tools to make API building fun and easy

Haypi will set up a sensible express server for you, and make a lot of things that are needs everywhere globally available

We made a few assumptions to allow a more powerful set of tools:  
We are using a superset of the JSON schema spec for validation of input and output data. 
You can get the full details of the format at www.github.com/hippopotamus2/json-schema-docs.
The superset allows us to not only validate the data coming in and out, but also allows for role based auth, not only on the route level, but also one each field.  
The format for defining the uris is used for building the router.
This means that your schema will be 1:1 with the routes. If you follow REST, this won't cause any problems.

Another assumption that we made is that the controllers should be 1:1 with the routes (and, by association, the schema).
Again, if you follow REST, this doesn't pose any problems.

### Usage

```js
let haypi = require('haypi');

haypi.dbs = require('./drivers'); // NOTE this must be set in context before controllers
haypi.controllers = require('./controllers');
haypi.schemas = require('./schemas');

haypi.start({ name: "My Awesome App", port: 3000 });
```
That's all, and your app will be running with documentation at `/docs` and all of the routes hooked to your controller functions.

You can look inside index.js for all the stuff that is setable in the haypi context. You can actually throw anything you want in there. We're not stopping you
