var _ = (typeof require == 'function' && require('lodash')) || _;

(function(){

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
			return _.includes(keywords, key)
		}) && _.isString(obj.type);
	};


	var buildProps = function(rootObj, obj, _props, recipes, startingProps, _v){
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
				_v[propName] = {};
				var subsmartObject = buildProps(rootObj, {}, _props[propName], recipe, startingProps[propName], _v[propName]);

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

			//check prop type is valid
			if(!_.includes(_.keys(typeValidations), definition.type)) throw "smart-objects : '" + definition.type + "' invalid type.";

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
				if(_.isFunction(val)) val = val.call(rootObj);
				if(!_.isUndefined(val)) return val;
				return result;
			});

			_v[propName] = function(){
				if(_.isFunction(definition.validate)) return definition.validate.call(rootObj, _props[propName]);
				return true;
			}
		});

		return obj;
	};



	var smartObject = function(blueprint){
		blueprint.statics = blueprint.statics || {};

		var _v = {};

		return _.extend(blueprint.statics , {
			create : function(startingProps){
				var obj = Object.create(_.extend({
					_props : {},
					_v : {},
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
				}, {
					validate : function(){
						var result = {};

						var check = function(obj){
							var result = {};
							_.each(obj, function(v_fn, propName){
								var r;
								if(_.isFunction(v_fn)){ r = v_fn(); }
								else if(_.isObject(v_fn)){ r = check(v_fn); }

								if(r === false){ result[propName] = 'Invalid yo'; }
								else if(_.isString(r)){ result[propName] = r; }
								else if(_.isObject(r) && !_.isEmpty(r)){ result[propName] = r; }
							});
							return _.isEmpty(result) || result;
						}

						return check(this._v);
					}
				}, blueprint.methods));
				return buildProps(obj, obj, obj._props, blueprint.props, startingProps, obj._v);
			},


		});
	};


	(typeof module !== 'undefined' && (module.exports = smartObject));
})();
