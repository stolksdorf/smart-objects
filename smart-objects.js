var _ = require('underscore');

var defaults = {
	'any'    : function(){ return;    },
	'string' : function(){ return ''; },
	'number' : function(){ return;    },
	'array'  : function(){ return []; },
	'object' : function(){ return {}; },
	'boolean': function(){ return;    }
}

var validations = {
	'any'    : function(){ return true; },
	'string' : _.isString,
	'number' : _.isNumber,
	'array'  : _.isArray,
	'object' : _.isObject,
	'boolean': _.isBoolean
};

var validate = function(name, type, val){
	if(!validations[type](val) && !_.isUndefined(val)){
		throw new TypeError("Property '" + name + "' only supports " + type);
	}
};

var smartObj = function(funcs){
	var propRecipes = funcs.props;
	delete funcs.props;

	return {
		create : function(startingProps){
			var obj = Object.create(_.extend({
				_props : {},
				_events : [],
				toJSON : function(){
					return this._props;
				},
				trigger : function(eventName, args){
					_.each(this._events, function(event){
						if(event.name == eventName) event.fn(args);
					});
					return this;
				},
				on : function(name, fn){
					this._events.push({
						name : name,
						fn : fn
					});
					return this;
				},
				set : function(obj){
					_.extend(this, obj);
					return this;
				},
			}, funcs));
			return this.buildProps(obj, obj, obj._props, propRecipes, startingProps);
		},

		buildProps : function(rootObj, obj, _props, recipes, startingProps){
			startingProps = startingProps || {};
			var self = this;
			_.each(recipes, function(propType, propName){
				//Check for a custom default value
				var def;
				if(_.isArray(propType)){
					def = propType[1];
					propType = propType[0];
				}

				//Check to see if there's a nested prop definition
				if(_.isObject(propType)){
					var recipe = propType;
					_props[propName] = {};
					var subsmartObject = self.buildProps(rootObj, {}, _props[propName], recipe, startingProps[propName]);

					//Define a special property if it's a nested prop definition
					Object.defineProperty(obj, propName, {
						enumerable : true,
						get : function(){
							return subsmartObject
						},
						set : function(val){
							validate(propName, 'object', val);
							_.extend(subsmartObject, val);
						}
					});
					return;
				}

				//Default to 'any' type
				if(!propType) propType = 'any';
				if(!_.has(defaults, propType)){
					throw new TypeError("Property type not supported: " + propType);
				}
				Object.defineProperty(obj, propName, {
					enumerable : true,
					get : function(){
						return _props[propName];
					},
					set : function(val){
						validate(propName, propType, val);
						if(_props[propName] !== val){
							_props[propName] = val;
							rootObj.trigger('change', propName);
							rootObj.trigger('change:' + propName, val);
						}
					}
				});

				//set the default value to the passed in one, custom default, or type's default. In that order
				obj[propName] = _.find([startingProps[propName], def, defaults[propType]()], function(val){
					return !_.isUndefined(val);
				});
			});

			return obj;
		}
	}
};

module.exports = smartObj;