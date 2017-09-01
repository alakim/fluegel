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
			useCanvas: true, // при отрисовке маркеров через canvas лучше отрабатываются
				// перемещения по тексту с помощью клавиатуры, однако при попытке выделения текста через границы маркеров в Selection попадает только последний текстовый фрагмент (в Firefox, в Google Chrome и IE все нормально).
				// При другом способе отрисовки (через SVG) выделение через границы маркеров проходит успешно, но при перемещении по тексту с помощью клавиатуры курсор упирается в маркер, и дальше не движется (в Firefox, в Google Chrome нормально, но можно редактировать имя маркера, что не хорошо. В IE тоже перемещения происходят нормально, но можно удалить маркер клавишей Del).
				// Вообще, в IE выделять как-то неудобно - трудно выделить с середины фрагмента текста, почему-то стремится захватить от границы ближайшего маркера
				// В режиме Canvas в любом браузере можно удалить с клавиатуры маркер (в Firefox и Google Chrome только клавишей Backspace, а в IE как через Backspace, так и через Delete)
				// В режиме SVG маркеры удаляются полностью в IE, а в Firefox и Google Chrome удаляются имена маркеров, сами же маркеры остаются

				// ******** ВОЗМОЖНОЕ РЕШЕНИЕ ********
				// Надо использовать window.getSelection(), 
				// в полученном объекте есть свойство rangeCount,
				// и метод getRangeAt(index), через который можно
				// получать объекты Range при множественном выделении
			highlightOpposite: true 
		}
	};

	var $H = $C.simple;
	var px = $C.css.unit.px,
		pc = $C.css.unit.pc,
		css = $C.css.keywords;


	$C.css.writeStylesheet({
		'.fluegel':{
			width: px(Settings.size.w),
			// height: px(Settings.size.h),
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
		console.log(selection, bgn, end);
		console.log(bgn.startContainer.nodeValue, bgn.startOffset, ' to ', end.endContainer.nodeValue, end.endOffset);


		function insertTag(node, pos, name, closing){
			var txt = node.nodeValue,
				txtBefore = txt.slice(0, pos),
				txtAfter = txt.slice(pos, txt.length);
			// var tNd = document.createTextNode(txtBefore+'<'+(closing?'/':'')+tagName+'>'+txtAfter);


			node.parentNode.insertBefore(document.createTextNode(txtBefore), node);
			insertMarker(node, name, closing)
			node.parentNode.insertBefore(document.createTextNode(txtAfter), node);
			// node.parentNode.insertBefore(tNd, node);
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
			// setOpposites(node);
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
			templates.canvasMarkerDraw(cnv, false);
			$(cnv).mouseover(function(){
				highlightOpposite($(this));
			}).mouseout(function(){
				highlightOpposite($(this), true);
			});
		}


		if(bgn.startContainer==bgn.endContainer){
			// alert('Эта ситуация пока не поддерживается! Начало и конец выделения должны быть в разных элементах');
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
		canvasMarker: function(name, closing){
			var sz = Settings.marker.size;
			return $C.html.canvas({
				'class':'marker',
				width:px(sz.w), height: px(sz.h),
				'data-name':name,
				'data-closing':!!closing
			});
		},
		canvasMarkerDraw: function(el, highlight){
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
			
		},
		marker: function(name, closing){
			var svg = $C.getTagDefinitions('path;text;tspan'),
				sz = Settings.marker.size;

			function pair(x, y){
				return [x, y].join(',');
			}

			return $C.html.svg({
					'class':'marker',
					width:sz.w, height: sz.h,
					'data-name':name,
					'data-closing':closing?true:false
				},
				svg.path({
					style:'fill:'+Settings.marker.bgColor.lo+';stroke:none;',
					d:[
						'M',
						pair(closing?sz.w:0, 0),
						pair(sz.w/2, 0),
						pair(closing?0:sz.w, sz.h/2),
						pair(sz.w/2, sz.h),
						pair(closing?sz.w:0, sz.h),
						'Z'
					].join(' ')
				}),
				Settings.marker.textLabels?svg.text({
					style:$C.formatStyle({
						'font-size': px(sz.h*.8),
						'font-weight':$C.css.keywords.bold,
						'text-anchor':'middle',
						fill: Settings.marker.color.lo
					}),
					x:closing?sz.w*.7 :sz.w*.4,
					y:sz.h*.8
				},
					svg.tspan(name)
				):null
			);
		}
	};

	function insertMarkers(docText){
		//return docText;
		return docText.replace(/<(\/)?([^>]+)>/gi, function(str, closing, name){
			return Settings.marker.useCanvas?templates.canvasMarker(name, closing)
				:templates.marker(name, closing);
		});
	}

	function highlightOppositeCanvas(marker, hide){
		templates.canvasMarkerDraw(marker[0], !hide);
		templates.canvasMarkerDraw(marker[0].opposite, !hide);
		
	}

	function highlightOpposite(marker, hide){
		if(!Settings.marker.highlightOpposite) return;
		if(Settings.marker.useCanvas){
			highlightOppositeCanvas(marker, hide);
			return;
		}
		var opposite = marker[0].opposite;
		
		if(hide){
			var oSt = marker[0].oldStyle;
			if(oSt){
				marker.find('path').attr({style: oSt});
				if(opposite) $(opposite).find('path').attr({style:oSt});
			}
			var oTs = marker[0].oldTxtStyle;
			if(oTs){
				marker.find('text').attr({style: oTs});
				if(opposite) $(opposite).find('text').attr({style: oTs});
			}
			return;
		}

		var path = marker.find('path');
		marker[0].oldStyle = path.attr('style');
		var st = getStyle(marker[0].oldStyle);
		st.fill = Settings.marker.bgColor.hi;
		setStyle(path, st);

		var txt = marker.find('text');
		marker[0].oldTxtStyle = txt.attr('style');
		var ts = getStyle(marker[0].oldTxtStyle);
		ts.fill = Settings.marker.color.hi;
		setStyle(txt, ts);

		if(opposite){
			setStyle($(opposite).find('path'), st);
			setStyle($(opposite).find('text'), ts);
		}

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

	function drawCanvasMarkers(pnl){
		$(pnl).find('.marker').each(function(i, el){
			templates.canvasMarkerDraw(el);
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

			var clipboardData = ev.clipboardData 
				|| ev.originalEvent.clipboardData
				|| window.clipboardData;
			var copiedData = clipboardData.getData('Text');
			console.log('text copied: ', copiedData, ev);
		})
		.bind('cut', function(ev){
			ev.stopPropagation();

			var clipboardData = ev.clipboardData 
				|| ev.originalEvent.clipboardData
				|| window.clipboardData;
			var cuttedData = clipboardData.getData('Text');
			console.log('text cutted: ', cuttedData, ev);
		})
		.bind('paste', function(ev){
			ev.stopPropagation();

			var clipboardData = ev.clipboardData 
				|| ev.originalEvent.clipboardData
				|| window.clipboardData;
			var pastedData = clipboardData.getData('Text');
			console.log('text pasted: ', pastedData, ev);
		})
		.find('.btSelI').click(function(){
			selectWith('i');
		}).end()
		.find('.btSelB').click(function(){
			selectWith('b');
		}).end()
		.find('.marker').mouseover(function(){
			//var title = $(this).attr('data-name');
			highlightOpposite($(this));
		}).mouseout(function(){
			highlightOpposite($(this), true);
		}).end();

		if(Settings.marker.useCanvas)
			drawCanvasMarkers(el);

		setOpposites(el);

		function harvest(node){
			node = node || el.find('.fluegelEditor')[0];

			if(node.nodeName==(Settings.marker.useCanvas?'CANVAS':'svg')){
				var nd = $(node),
					nm = nd.attr('data-name'),
					cls = nd.attr('data-closing')=='true';
				return [
					'<',
					cls?'/':'',
					,nm,
					'>'
				].join('');
			}

			if(!node.childNodes.length) return node.nodeValue;
			
			var res = [];
			for(var n,i=0; n=node.childNodes[i],i<node.childNodes.length; i++){
				res.push(harvest(n));
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
