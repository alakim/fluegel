var Clarino = (function(){
	var Html = {},
		Css = {};
	var Clarino = {
		xhtmlMode: true	
	};
	
	function extend(o,s){for(var k in s){o[k] = s[k];}}

	function compose(path){
		if(typeof(path)=='string') path = path.split(';');
		var res = {};
		for(var p,i=0; p=path[i],i<path.length; i++){
			p = p.split('.');
			var v = Clarino, s;
			for(var j=0; j<p.length; j++){
				s = p[j]; v = v[s];
			}
			res[s] = v;
		}
		return res;
	};
	
	function each(coll, F){
		if(!coll) return;
		if(coll instanceof Array)
			for(var i=0; i<coll.length; i++){F(coll[i], i);}
		else
			for(var k in coll){F(coll[k], k);}
	}
	
	function tag(name, content, selfClosing, notEmpty){
		var h = [], a = [];
		each(content, function(el){
			if(typeof(el)!="object")
				h.push(el);
			else{
				each(el, function(val, nm){
					a.push(" "+nm+"=\""+val+"\"");
				});
			}
		});
		
		h = h.join("");
		if(h.match(/^\s+$/i)) h = "";
		if(notEmpty && h.length==0) h = "&nbsp;";
		
		if(selfClosing && h.length==0)
			return "<"+name+a.join("")+(Clarino.xhtmlMode? "/>":">");
		else
			return "<"+name+a.join("")+">"+h+"</"+name+">";
	}
	
	function defineTags(tags, selfClosing, notEmpty){
		if(!(tags instanceof Array)) tags = tags.split(";");
		each(tags, function(t){
			var tN = t.indexOf("_")==0?t.slice(1):t;
			Html[t] = function(content){
				return tag(tN, arguments, selfClosing, notEmpty);
			}
		});
	}
	
	function defineSelfClosingTags(tags){defineTags(tags, true, false);}
	function defineNotEmptyTags(tags){defineTags(tags, false, true)}
	function markup(){
		var res = [];
		each(arguments, function(tag){
			res.push(tag);
		});
		return res.join("");
	}
	
	function repeat(count, F, delim){
		var h = [];
		for(var i=0; i<count; i++)
			h.push(F(i+1));
		return h.join(delim||"");
	}
	
	function emptyValue(v){return !v ||(typeof(v)=="string"&&v.length==0);}
	
	extend(Clarino, {
		extend: extend,
		compose: compose,
		repeat: repeat,
		
		markup: markup,
		
		json: function(o){
			if(o==null) return 'null';
			if(typeof(o)=="string") return "'"+o.replace(/\"/g, "\\\"")+"'";
			if(typeof(o)=="boolean") return o.toString();
			if(typeof(o)=="number") return o.toString();
			if(typeof(o)=="function") return "";
			if(o.constructor==Array){
				var res = [];
				for(var i=0; i<o.length; i++) res.push(Clarino.json(o[i]));
				return "["+res.join(",")+"]";
			}
			if(typeof(o)=="object"){
				var res = [];
				for(var k in o) res.push(k+":"+Clarino.json(o[k]));
				return "{"+res.join(",")+"}";
			}
			return "";
		},
		
		format: function(str, v1, v2){
			for(var i=0; i<arguments.length; i++){
				str = str.replace(new RegExp("{\s*"+i+"\s*}", "ig"), arguments[i+1])
			}
			return str;
		},

		entities: function(str){
			if(!str) return '';
			str = str.toString();
			return str.replace(/\&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/\"/g, '&quot;')
				.replace(/\'/g, '&apos;');
		},
		
		tag: tag,
		
		apply: function(coll, F, delim, hideEmpty){
			var h = [];
			each(coll, function(el, i){
				if(!emptyValue(el) || !hideEmpty){
					var v = F(el, i);
					if(!emptyValue(v) || !hideEmpty)
						h.push(v);
				}
			});
			return h.join(delim||"");
		},
		
		
		formatStyle: function(){
			function addUnits(nm, val){
				if((nm=="width"||nm=="height"||nm=="top"||nm=="left"||nm=='font-size')&&typeof(val)=="number") return val+"px";
				return val;
			}
			
			var s = {};
			for(var i=0; i<arguments.length; i++){
				extend(s, arguments[i]);
			}
			var r = [];
			for(var k in s){
				var kk = k.replace(/([A-Z])/g, function(v){
					//console.log(v);
					return '-'+v.toLowerCase();
				});
				r.push(kk+":"+addUnits(kk, s[k]));
			}
			return r.join(";");
		},
		
		callFunction: function(name, a1, a2){
			var args = [];
			for(var i=1; i<arguments.length; i++){
				var arg = arguments[i];
				arg = typeof(arg)=="string" && arg.match(/^@/)? arg.slice(1, arg.length)
					:Clarino.json(arg);
				args.push(arg);
			}
			return [name, "(", args.join(","), ")"].join("");
		},
		defineTags: function(tags){
			if(!(tags instanceof(Array)))tags=tags.split(";");
			defineTags(tags);
		},
		getTagDefinitions: function(tags){
			if(!(tags instanceof(Array)))tags=tags.split(";");
			function defTag(nm){return function(){return Clarino.tag(nm, arguments, true);}}
			var res = {}
			for(var i=0,t; t=tags[i],i<tags.length; i++) res[t] = defTag(t);
			return res;
		}
	});

	// extend(Html, { });
	
	defineTags("div;a;p;span;nobr;ul;ol;li;i;table;tbody;thead;tr;input;label;textarea;pre;select;option;optgroup;h1;h2;h3;h4;h5;h6;button;form;dl;dt;dd;svg");
	defineTags('abbr;address;area;article;aside;audio;b;base;bdi;bdo;blockquote;body;canvas;caption;cite;code;col;colgroup;datalist;del;details;dfn;dialog;em;embed;fieldset;figcaption;figure;footer;head;header;html;ins;kbd;keygen;legend;link;main;map;mark;menu;menuitem;meta;meter;nav;noscript;object;output;param;picture;progress;q;rp;rt;ruby;s;samp;script;section;small;source;strong;style;sub;summary;sup;tfoot;time;title;track;u;var;video;wbr');
	
	defineSelfClosingTags("img;hr;br;iframe");
	defineNotEmptyTags("th;td");
	
	
	
	function writeStyle(defs, sel, stylesheet){
		if(typeof(defs)=="function") defs = defs();
		var children = {};
		
		function insertHyphens(nm){
			nm = nm.replace(/([A-Z])/g, function(m){
				return "-"+m.toLowerCase();
			});
			return nm;
		}
		
		function attrName(nm){
			var attNm = Css.attributes[nm] || nm;
			return insertHyphens(attNm);
		}
		
		stylesheet.push(sel+"{");
		each(defs, function(v, nm){
			//console.log(v);
			if(typeof(v)=="function") v = v();
			if(typeof(v)!="object"){
				stylesheet.push([attrName(nm), ":", v, ";"].join(" "));
			}
			else if(v instanceof Array){
				for(var el,i=0; el=v[i],i<v.length; i++){
					stylesheet.push([attrName(nm), ":", el, ";"].join(" "));
				}
			}
			else{
				children[nm] = v;
			}
		});
		stylesheet.push("}");
		
		each(children, function(cDef, cSel){
			writeStyle(cDef, sel+cSel, stylesheet);
		});
	}

	Css.rules = function(title, styles){
		return title+'{\n'
			+ Css.stylesheet(styles)
			+'\n}';
	}
	
	Css.writeRules = function(title, styles){
		document.write('<style type="text/css">\n');
		document.write(Css.cssRules(title, styles));
		document.write('\n</style>\n');
	}

	Css.attributes = {};
	
	Css.stylesheet = function(css){
		var stylesheet = [];
		each(css, function(defs, sel){
			writeStyle(defs, sel, stylesheet);
		});
		return stylesheet.join("\n");
	}
	
	Css.writeStylesheet = function(css){
		document.write('<style type="text/css">\n');
		document.write(Css.stylesheet(css));
		document.write('\n</style>\n');
	}
	
	Css.unit = function(name){
		function format(v){
			if(typeof(v)==='string') return v;
			if(v instanceof Array) return v.join(name+' ')+name;
			return v+name;
		}
		return 	function(v){
			if(arguments.length==1) return format(v);
			var res = [];
			for(var i=0,a; a=arguments[i],i<arguments.length; i++){
				res.push(format(a));
			}
			return res.join(' ');
		}
	}

	extend(Css.unit, {
		px: Css.unit('px'),
		pc: Css.unit('%'),
		em: Css.unit('em')
	});

	Clarino.symbols = function(str){
		var res = {}, c=str.split(';');
		for(var s,i=0; s=c[i],i<c.length; i++){
			var sVal = s.replace(/[A-Z]/g, function(v){
				// console.log(v);
				return '-'+v.toLowerCase();
			});
			res[s] = sVal;
		}
		return res;
	};

	Css.keywords = Clarino.symbols('block;none;flex;row;rowReverse;column;columnReverse;left;right;center;hidden;pointer;bold;normal;uppercase;lowercase;absolute;relative;fixed;underline;auto;collapse;separate;dotted;inherit;inline;default;solid;wrap;nowrap;wrapReverse;spaceBetween;spaceAround;spaceEvently;flexStart;flexEnd;baseline;stretch');
	
	function compareVersions(v1, v2){
		if(v1==v2) return 0;
		v1 = v1.split(".");
		v2 = v2.split(".");
		for(var i=0; i<3; i++){
			var a = parseInt(v1[i], 10),
				b = parseInt(v2[i], 10);
			
			if(a<b) return -1;
			if(a>b) return 1;
		}
		return 0;
	}
	
	function version(num){
		if(!num) return topVersion;
		for(var k in interfaces){
			if(compareVersions(num, k)<=0){
				var $H = {};
				extend($H, interfaces[k]);
				return $H;
			}
		}
		console.error("Clarino version "+num+" not supported");
	}
	
	var topVersion = "1.0.1";
	
	// if(typeof(JSUnit)=="object") 
	Clarino.compareVersions = compareVersions;
	
	var interfaces = {};
	interfaces[topVersion] = Clarino;
	
	var intf = {
		version: version
	};
	
	extend(Clarino, intf);
	Clarino.html = Html;
	Clarino.css = Css;
	Clarino.simple = compose('markup;apply;repeat;format;formatStyle;entities;callFunction');
	//var simpleHtml = compose('html.div');
	var simpleHtml = compose('html.div;html.a;html.p;html.span;html.nobr;html.hr;html.br;html.img;html.ul;html.ol;html.li;html.table;html.tbody;html.thead;html.tr;html.td;html.th;html.input;html.label;html.textarea;html.pre;html.select;html.option;html.optgroup;html.h1;html.h2;html.h3;html.h4;html.h5;html.h6;html.button;html.form;html.dl;html.dt;html.dd');
	extend(Clarino.simple, simpleHtml);
	
	return Clarino;
})();
