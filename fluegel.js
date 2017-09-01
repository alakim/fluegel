(function($, $C){

	var Settings = {
		size: {w: 800, h:200},
		button:{
			size:30
		},
		marker:{
			size:{w:20, h:12},
			bgColor:{lo:'#4444ff', hi:'#00ff00', error:'#ff0000'},
			color: {lo:'#ffff00', hi:'#000044'},
			textLabels: true,
			highlightOpposite: true 
		}
	};

	var $H = $C.simple;
	var px = $C.css.unit.px,
		pc = $C.css.unit.pc,
		css = $C.css.keywords;

	var clipBoard = '';


	$C.css.writeStylesheet({
		'.fluegel':{
			width: px(Settings.size.w),
			' .fluegelButtonsPanel':{
				width: pc(100),
				background: '#eee',
				border: px(1)+' solid #888',
				padding: px(1, 5),
				' button':{
					background: '#ccc',
					border: px(1)+' solid #888',
					borderRadius: px(4),
					margin: px(0, 8),
					height: px(Settings.button.size),
					minWidth: px(Settings.button.size)
				}
			},
			' .fluegelEditor':{
				padding:px(5),
				border:px(1)+' solid #ccc',
				width: pc(100),
				height:px(Settings.size.h - Settings.button.size),
				' .marker':{
					cursor: css.default
				}
			}
		}
	});

	var uid = (function(){
		var counter = 1;
		return function(){
			return counter++;
		};
	})();

	function selectWith(tagName){
		var selection = window.getSelection(),
			bgn = selection.getRangeAt(0),
			end = selection.getRangeAt(selection.rangeCount-1);
		// console.log(selection, bgn, end);
		// console.log(bgn.startContainer.nodeValue, bgn.startOffset, ' to ', end.endContainer.nodeValue, end.endOffset);


		function insertTag(node, pos, name, closing){
			var txt = node.nodeValue,
				txtBefore = txt.slice(0, pos),
				txtAfter = txt.slice(pos, txt.length);

			node.parentNode.insertBefore(document.createTextNode(txtBefore), node);
			insertMarker(node, name, closing)
			node.parentNode.insertBefore(document.createTextNode(txtAfter), node);
			node.parentNode.removeChild(node);
		}

		function insertTagsPair(node, pos1, pos2, name){
			var txt = node.nodeValue,
				t1 = txt.slice(0, pos1),
				t2 = txt.slice(pos1, pos2),
				t3 = txt.slice(pos2, txt.length);
			//console.log(t1, t2, t3);
			node.parentNode.insertBefore(document.createTextNode(t1), node);
			insertMarker(node, name)
			node.parentNode.insertBefore(document.createTextNode(t2), node);
			insertMarker(node, name, true)
			node.parentNode.insertBefore(document.createTextNode(t3), node);
			node.parentNode.removeChild(node);
		}

		function insertMarker(node, name, closing){
			var cnv = document.createElement('canvas');
			var sz = Settings.marker.size;
			cnv.setAttribute('class', 'marker');
			cnv.setAttribute('width', px(sz.w));
			cnv.setAttribute('height', px(sz.h));
			cnv.setAttribute('data-name', name);
			cnv.setAttribute('data-closing', !!closing);
			node.parentNode.insertBefore(cnv, node);
			templates.markerDraw(cnv, false);
			$(cnv).mouseover(function(){
				highlightOpposite($(this));
			}).mouseout(function(){
				highlightOpposite($(this), true);
			});
		}


		if(bgn.startContainer==bgn.endContainer){
			insertTagsPair(bgn.startContainer, bgn.startOffset, bgn.endOffset, tagName);
		}
		else{
			insertTag(bgn.startContainer, bgn.startOffset, tagName, false);
			insertTag(end.endContainer, end.endOffset, tagName, true);
		}

		if (window.getSelection) {
			if (window.getSelection().empty) {  // Chrome
				window.getSelection().empty();
			} else if (window.getSelection().removeAllRanges) {  // Firefox
				window.getSelection().removeAllRanges();
			}
		} else if (document.selection) {  // IE?
			document.selection.empty();
		}

		setOpposites($('.fluegel'));
	}

	var templates = {
		marker: function(name, closing){
			var sz = Settings.marker.size;
			return $C.html.canvas({
				'class':'marker',
				width:px(sz.w), height: px(sz.h),
				'data-name':name,
				'data-closing':!!closing
			});
		},
		markerDraw: function(el, highlight){
			var sz = Settings.marker.size;
			var name = $(el).attr('data-name'),
				closing = $(el).attr('data-closing')=='true',
				unclosed = $(el).attr('data-unclosed')=='true';
			var ctx = el.getContext('2d');
			ctx.clearRect(0, 0, sz.w, sz.h);
			ctx.fillStyle = 
				unclosed?Settings.marker.bgColor.error
					:highlight?Settings.marker.bgColor.hi
					:Settings.marker.bgColor.lo;
			ctx.beginPath();
			if(closing){
				ctx.moveTo(sz.w/2, 0);
				ctx.lineTo(sz.w, 0);
				ctx.lineTo(sz.w, sz.h);
				ctx.lineTo(sz.w/2, sz.h);
				ctx.lineTo(0, sz.h/2);
			}
			else{
				ctx.moveTo(0, 0);
				ctx.lineTo(sz.w/2, 0);
				ctx.lineTo(sz.w, sz.h/2);
				ctx.lineTo(sz.w/2, sz.h);
				ctx.lineTo(0, sz.h);
			}
			ctx.fill();

			ctx.fillStyle = highlight?Settings.marker.color.hi
					:Settings.marker.color.lo;
			ctx.font = '12px Arial';
			ctx.fillText(name, closing?sz.w/2:sz.w*.2, sz.h*.8);
			
		}
	};

	function insertMarkers(docText){
		return docText.replace(/<(\/)?([^>]+)>/gi, function(str, closing, name){
			return templates.marker(name, closing);
		});
	}

	function highlightOpposite(marker, hide){
		templates.markerDraw(marker[0], !hide);
		templates.markerDraw(marker[0].opposite, !hide);
		
	}


	function getStyle(str){
		var res = {};
		var pairs = str.split(';');
		for(var p,i=0; p=pairs[i],i<pairs.length; i++){
			var v = p.split(':');
			if(v[0].length){
				res[v[0]] = v[1];
			}
		}
		return res;
	}
	function setStyle(el, style){
		var res = [];
		for(var k in style){
			res.push([k, style[k]].join(':'));
		}
		$(el).attr({style: res.join(';')});
	}

	function setOpposites(el){
		var path = [];
		el.find('.marker').each(function(i, mrk){mrk=$(mrk);
			var closed = mrk.attr('data-closed')=='true';
			if(closed) return;

			var nm = mrk.attr('data-name'),
				closing = mrk.attr('data-closing')=='true';

			if(closing){
				var opened = path[path.length-1],
					oNm = opened.attr('data-name');
				if(oNm!=nm){
					console.error('Unclosed tag %s', oNm);
					mrk.attr('data-unclosed', true);
					return;
				}
				opened[0].opposite = mrk[0];
				mrk[0].opposite = opened[0];
				path.splice(path.length-1, 1);
				mrk.attr('data-unclosed', false);
			}
			else{
				path.push(mrk);
			}
		});
	}

	function drawMarkers(pnl){
		$(pnl).find('.marker').each(function(i, el){
			templates.markerDraw(el);
		});
	}

	function init(el, config, docText){
		el.addClass('fluegel');
		el.html((function(){with($H){
			return markup(
				div({'class':'fluegelButtonsPanel'},
					button({'class':'btSelI'}, 'I'),
					button({'class':'btSelB'}, 'B')
				),
				div({'class':'fluegelEditor', contenteditable:true}, insertMarkers(docText))
			);
		}})())
		.bind('copy', function(ev){
			ev.stopPropagation();
			ev.preventDefault();
			var sel = getCodeSelection();

			clipBoard = sel.textInner;
		})
		.bind('cut', function(ev){
			ev.stopPropagation();
			ev.preventDefault();
			var sel = getCodeSelection();

			clipBoard = sel.textInner;
			init(el, config, sel.textBefore+sel.textAfter);

		})
		.bind('paste', function(ev){
			ev.stopPropagation();
			ev.preventDefault();
			var sel = getCodeSelection();

			init(el, config, sel.textBefore+clipBoard+sel.textAfter);

		})
		.find('.btSelI').click(function(){
			selectWith('i');
		}).end()
		.find('.btSelB').click(function(){
			selectWith('b');
		}).end()
		.find('.marker').mouseover(function(){
			highlightOpposite($(this));
		}).mouseout(function(){
			highlightOpposite($(this), true);
		}).end();

		drawMarkers(el);

		setOpposites(el);

		function getCodeSelection(){
			var code = harvest(null, true);

			var selection = window.getSelection(),
				bgn = selection.getRangeAt(0),
				end = selection.getRangeAt(selection.rangeCount-1);

			function getLabel(node){
				return '#text'+node.fluegelID+';';
			}

			var startLabel = getLabel(bgn.startContainer),
				endLabel = getLabel(end.endContainer);

			var startPos = code.indexOf(startLabel) + bgn.startOffset + startLabel.length, 
				endPos = code.indexOf(endLabel) + end.endOffset + endLabel.length;

			var txtBefore = code.slice(0, startPos),
				txtInner = code.slice(startPos, endPos),
				txtAfter = code.slice(endPos, code.length);

			function removeTextIDs(txt){
				return txt.replace(/#text\d+;/g, '');
			}
			

			var res = {
				sourceCode: removeTextIDs(code),
				textBefore: removeTextIDs(txtBefore),
				textInner: removeTextIDs(txtInner),
				textAfter: removeTextIDs(txtAfter)
			};
			console.log('Selection: %o', res);
			return res;
		}

		function harvest(node, insertIDs){
			node = node || el.find('.fluegelEditor')[0];
			switch(node.nodeName){
				case 'CANVAS':
					var nd = $(node),
						nm = nd.attr('data-name'),
						cls = nd.attr('data-closing')=='true';
					return [
						'<',
						cls?'/':'',
						,nm,
						'>'
					].join('');
				case '#text':
					if(insertIDs){
						var id = uid();
						node.fluegelID = id;
						return ['#text', id, ';', node.nodeValue].join('');
					}
					return node.nodeValue;
				default: break;
			}

			if(!node.childNodes.length) return node.nodeValue;
			
			var res = [];
			for(var n,i=0; n=node.childNodes[i],i<node.childNodes.length; i++){
				res.push(harvest(n, insertIDs));
			}

			return res.join('');
		}

		return {
			harvest: harvest
		}
	}

	$.fn.fluegel = function(config, docText){
		var el = $(this)[0];
		return init($(el), config, docText); 
	}
})(jQuery, Clarino.version('0.0.0'));
