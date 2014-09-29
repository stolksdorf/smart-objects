var _ = (typeof require == 'function' && require('underscore')) || _;

var defaults = {
	'any'    : function(){ return;    },
	'string' : function(){ return ''; },
	'number' : function(){ return;    },
	'array'  : function(){ return []; },
	'object' : function(){ return {}; },
	'boolean': function(){ return;    }
}

var typeValidations = {
	'any'    : function(){ return true; },
	'string' : _.isString,
	'number' : _.isNumber,
	'array'  : _.isArray,
	'object' : _.isObject,
	'boolean': _.isBoolean
};

var typeCheck = function(name, type, val){
	if(!typeValidations[type](val) && !_.isUndefined(val)){
		throw new TypeError("Property '" + name + "' only supports " + type);
	}
};

//Every property on the object has to belong to the above list. And 'type' is a string.
var isDefinitionObj = function(obj){
	var keywords = ['type', 'default', 'required', 'validate'];
	return _.every(obj, function(val, key){
		return _.contains(keywords, key)
	}) && _.isString(obj.type);
};


buildProps = function(rootObj, obj, _props, recipes, startingProps){
	startingProps = startingProps || {};
	_.each(recipes, function(propVal, propName){
		//Default to 'any' type
		var definition = {
			type : 'any'
		};

		if(_.isString(propVal)){
			definition.type = propVal;
		}else if(isDefinitionObj(propVal)){
			definition = propVal;
		}else if(_.isObject(propVal)){
			//Check to see if there's a nested prop definition
			var recipe = propVal;
			_props[propName] = {};
			var subsmartObject = buildProps(rootObj, {}, _props[propName], recipe, startingProps[propName]);

			//Define a special property if it's a nested prop definition
			Object.defineProperty(obj, propName, {
				enumerable : true,
				get : function(){
					return subsmartObject
				},
				set : function(val){
					typeCheck(propName, 'object', val);
					_.extend(subsmartObject, val);
				}
			});
			return;
		}

		Object.defineProperty(obj, propName, {
			enumerable : true,
			get : function(){
				return _props[propName];
			},
			set : function(val){
				typeCheck(propName, definition.type, val);
				if(_props[propName] !== val){
					_props[propName] = val;
					rootObj.trigger('change', propName);
					rootObj.trigger('change:' + propName, val);
				}
			}
		});

		//set the default value to the passed in one, custom default, or type's default. In that order
		obj[propName] = _.reduce([defaults[definition.type](), definition.default, startingProps[propName]], function(result, val){
			if(_.isFunction(val)){
				val = val.call(rootObj);
			}
			if(!_.isUndefined(val)) return val;
			return result;
		});
	});

	return obj;
};



var smartObject = function(blueprint){
	blueprint.statics = blueprint.statics || {};

	return _.extend(blueprint.statics , {
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
			}, blueprint.methods));
			return buildProps(obj, obj, obj._props, blueprint.props, startingProps);
		}

	});
};


(typeof module !== 'undefined' && (module.exports = smartObject));