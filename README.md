strict-objects
=============

Stricts Objects allow you to create a blueprint of properties for an object. These properties can then be validated and have events fired when these properties are modified. Heavy influenced by the [Ampersand State](http://ampersandjs.com/docs#ampersand-state) project. Strict Objects use [definable properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) so you don't have to bother with `.set()`, simple assignment will just work.

In short, use Strict Objects if:

* You know exactly the structure of your object
* Having default values on your object is useful
* You want type checking on object properties
* You want to fire events whenever a property is modified
* You want to add additional properties/functions on an object that aren't serialized

### Creating a Strict-Object

Let's create a simple user model

	var UserModel = strictObj({
		props : {
			name : 'string',
			age : 'number',
			posts : 'array',
			customData : 'object',
			userType : {
				tier : 'string',
				isAwesome : ['boolean', false]
			},
			additionalData : 'any'
		}
	});


Each strict object should have a `props` object outlining the properties you care about, along with their type. On creation, those properties are defaulted to that type's default value. So in our example,`loggedInUser.posts` will actually be initialized as an empty array. You get and set these properties just as you would normally, no worrying about `.set()` or `.get()` functions.

	var loggedInUser = UserModel.create({ name : 'Bromley'});

	if(loggedInUser.userType.isAwesome){
		loggedInUser.additionalData = 'Not cool bro';
	}


### Events

Strict Objects fire change events whenever one of it's tracking properties is modified. `change` is always fired whenever anything changes. To listen to a specific property only, use the syntax `'change:propName'`.

	loggedInUser.on('change', function(propName){
		console.log(propName + 'has changed!');
	});
	loggedInUser.on('change:age', function(newAge){
		console.log('why are you changing your age?');
	});
	loggedInUser.age = 21; //Both events will fire


### Validation

Property types are used for validation whenever a property is set.

	loggedInUser.name = 23;
	//Type Error: Property 'name' only supports string

If you aren't sure what type the property will be, but still want to listen to events on it, you can use the type of `'any'`.

	loggedInUser.additionalData = true;
	loggedInUser.additionalData = {powerLevel : 9001};
	//No errors here!


### Default Values

The property type can also be defined as an array, where the first parameter is the property's type and the second is it's custom default value.

	var UserModel = strictObj({
		props : {
			name : ['string', 'New User']
			age : 'number',
			posts : 'array',
			customData : ['object', {junk : true}]
			userType : {
				tier : ['string', 'bronze']
				isAwesome : ['boolean', false]
			},
			additionalData : ['any', {}]
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


### Functions

We can also define functions we want to be added to each strict object along with the `props`.

	var UserModel = strictObj({
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
		hasManyPosts : function(){
			return this.posts.length > 10;
		},
		toggleAwesome : function(){
			this.userType.isAwesome = !this.userType.isAwesome;
		}
	});

	var loggedInUser = UserModel.create({ name : 'Bromley'});

	loggedInUser.hasManyPosts(); //false



### Built-in Goodies

Each Strict Object comes with a few built-in goodies

**set** &nbsp; `strict_obj.set([object])` <br>
Set allows you to massively update your object's properties. Useful for initially defining a strict object with defaults and triggers waiting on response from an API, then setting that response to your object. This will do a validation check on each property as well.

**toJSON** &nbsp; `strict_obj.toJSON()` <br>
Returns a JSON version of your strict object without any of the getters or setters, or any additional properties you may have added. Perfect for shipping data off to an API.

**_props** &nbsp; `strict_obj._props` <br>
The strict object's properties are actually stored at `_props`. If you want to be sneaky and silently change some values without firing change events, you can do it here.

	loggedInUser._props.age = 21;
	loggedInUser.age; //it's 21! and not a single event was fired.