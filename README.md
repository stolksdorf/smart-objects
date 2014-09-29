smart-objects
=============

Smarts Objects allow you to create a blueprint of properties for an object. These properties can then be validated and have events fired when these properties are modified. Heavy influenced by the [Ampersand State](http://ampersandjs.com/docs#ampersand-state) project. Smart Objects use [definable properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) so you don't have to bother with `.set()`, simple assignment will just work.

In short, use Smart Objects if:

* You know exactly the structure of your object
* Having default values on your object is useful
* You want type checking on object properties
* You have validation on object properties
* You want to fire events whenever a property is modified
* You want to add additional properties/functions on an object that aren't serialized

### Creating a Smart-Object

Let's create a simple user model

	var UserModel = smartObj({
		props : {
			name : 'string',
			age : 'number',
			posts : {
				type : 'array',
				validate : function(val){
					return val.length > 0;
				}
			},
			customData : 'object',
			userType : {
				tier : 'string',
				isAwesome : {
					type : 'boolean',
					default : false
				}
			},
			created_on : {
				type : 'number',
				default : Date.now
			},
			additionalData : 'any'
		}
	});


Each smart object should have a `props` object outlining the properties you care about, along with their type. On creation, those properties are defaulted to that type's default value. So in our example,`loggedInUser.posts` will actually be initialized as an empty array. You get and set these properties just as you would normally, no worrying about `.set()` or `.get()` functions.

	var loggedInUser = UserModel.create({ name : 'Bromley'});

	if(!loggedInUser.userType.isAwesome){
		loggedInUser.additionalData = 'Not cool bro';
	}


### Events

Smart Objects fire change events whenever one of it's tracking properties is modified. `change` is always fired whenever anything changes. To listen to a specific property only, use the syntax `'change:propName'`.

	loggedInUser.on('change', function(propName){
		console.log(propName + 'has changed!');
	});
	loggedInUser.on('change:age', function(newAge){
		console.log('why are you changing your age?');
	});
	loggedInUser.age = 21; //Both events will fire


### Type Checking

Property types are used for type checking whenever a property is set.

	loggedInUser.name = 23;
	//Type Error: Property 'name' only supports string

If you aren't sure what type the property will be, but still want to listen to events on it, you can use the type of `'any'`.

	loggedInUser.additionalData = true;
	loggedInUser.additionalData = {powerLevel : 9001};
	//No errors here!


### Default Values

The property type can also be as an object containing a `default` field. This field can be a function, which will be called at creation time.

	var UserModel = smartObj({
		props : {
			name : {
				type : 'string',
				default : 'New User'
			},
			age : 'number',
			posts : 'array',
			customData : {
				type : 'object',
				default : {junk : true}
			},
			userType : {
				tier : {
					type : 'string',
					default : 'bronze'
				},
				isAwesome : {
					type : 'boolean',
					default : false
				},
			},
			additionalData : {
				type : 'any',
				default : {}
			}
		}
	});

	var emptyUser = UserModel.create();

	//What you get
	{
		name : 'New User',
		age : undefined,
		posts : [],
		customData : {junk : true},
		userType : {
			tier : 'bronze',
			isAwesome : false
		},
		additionalData : {}
	}

### Validation

Each smart object will have access to a `.validate()` function which will either return `true` or an object mapped with error messages. Each prop can have it's own validation function defined on the definition object as `validate`. The value of the prop will be passed in as a parameter, and the function context will be the smart object itself. To mark a field as invalid, either return `false` or a custom error string.

	var UserModel = smartObj({
		props : {
			name : {
				type : 'string',
				validate : function(name){
					return !!name
				}
			},
			age : 'number',
			posts : 'array',
			customData : 'object',
			userType : {
				tier : 'string',
				isAwesome : {
					type : 'boolean',
					default : false,
					validate : function(val){
						if(!val) return 'Must be Awesome'
					}
			}
		}
	});

	var loggedInUser = UserModel.create({ name : 'Bromley'});

	loggedInUser.validate();
	//Returns
	{
		name : 'Invalid',
		userType : {
			isAwesome : 'Must be Awesome'
		}
	}


### Methods

We can also define functions we want to be added to each smart object along with the `props`.

	var UserModel = smartObj({
		props : {
			name : 'string',
			age : 'number',
			posts : 'array',
			customData : 'object',
			userType : {
				tier : 'string',
				isAwesome : 'boolean'
			}
		},
		methods : {
			hasManyPosts : function(){
				return this.posts.length > 10;
			},
			toggleAwesome : function(){
				this.userType.isAwesome = !this.userType.isAwesome;
			}
		}
	});

	var loggedInUser = UserModel.create({ name : 'Bromley'});

	loggedInUser.hasManyPosts(); //false

### Statics

Static functions are added to the smart-object definition, but not the instance. This is useful for when you have a function that deals with your smart-objects, not a specific instance, or we want a function that will create many instances given criteria, such as `.fetchAllActiveUsers()`.


	var UserModel = smartObj({
		props : {
			name : 'string',
			age : 'number',
			posts : 'array',
			customData : 'object',
			userType : {
				tier : 'string',
				isAwesome : ['boolean', false]
			}
		},
		methods : {
			hasManyPosts : function(){
				return this.posts.length > 10;
			},
			toggleAwesome : function(){
				this.userType.isAwesome = !this.userType.isAwesome;
			}
		},
		statics : {
			getRecentUsers : function(){
				//...
			}
		}
	});


### Built-in Goodies

Each Smart Object comes with a few built-in goodies

**set** &nbsp; `smart_obj.set([object])` <br>
Set allows you to massively update your object's properties. Useful for initially defining a smart object with defaults and triggers waiting on response from an API, then setting that response to your object. This will do a validation check on each property as well.

**toJSON** &nbsp; `smart_obj.toJSON()` <br>
Returns a JSON version of your smart object without any of the getters, setters, or any additional properties you may have added. Perfect for shipping data off to an API.

**_props** &nbsp; `smart_obj._props` <br>
The smart object's properties are actually stored at `_props`. If you want to be sneaky and change some values without firing change events or not have it validated, you can do it here.

	loggedInUser._props.age = 21;
	loggedInUser.age; //it's 21! and not a single event was fired.