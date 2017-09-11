(function($, $C){

	var Settings = {
		size: {w: 800, h:200},
		button:{
			size:30
		},
		color:{
			dialogShield:'rgba(0, 0, 0, .75)',
			text:'#222',
			white:'#fff'
		},
		marker:{
			size:{w:25, h:12, arrow:7},
			fontSize: 12,
			bgColor:{lo:'#4444ff', hi:'#00ff00', error:'#ff0000'},
			color: {lo:'#ffff00', hi:'#000044'},
			textLabels: true,
			highlightOpposite: true 
		}
	};

	var $H = $C.simple;
	var px = $C.css.unit.px,
		pc = $C.css.unit.pc,
		vw = $C.css.unit('vw'),
		vh = $C.css.unit('vh'),
		css = $C.css.keywords;

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
			' .fluegelClipboard':{
				width:px(0*Settings.size.w),
				height:px(0*Settings.size.h),
				overflow:css.hidden,
				' textarea':{
					width:pc(100),
					height:pc(100)
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
		},
		'#fluegelAttributeDialog':{
			display: css.none,
			position: css.fixed,
			top: px(0), left:px(0),
			width:vw(100), height:vh(100),
			backgroundColor: Settings.color.dialogShield,
			' .dlgBody':{
				width: px(750),
				margin: px(30, 'auto'),
				backgroundColor:Settings.color.white,
				border: Settings.color.text,
				borderRadius: px(5),
				' .dlgHeader':{
					textAlign: css.center,
					fontSize:px(20),
					padding: px(8),
					borderBottom:px(1)+' solid '+Settings.color.text,
					marginBottom:px(5)
				},
				' .dlgContent':{
					padding: px(10),
					minHeight: px(400)
				},
				' .dlgButtons':{
					borderTop:px(1)+' solid '+Settings.color.text,
					padding:px(8, 50),
					display: css.flex,
					flexDirection: css.row,
					justifyContent: css.spaceAround,
					' button':{
						fontSize:px(16),
						backgroundColor: '#eee',
						border: px(1)+' solid '+Settings.color.text,
						borderRadius: px(3)
					}
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

	function parseAttributes(attributes){
		var attrJson = {};
		if(attributes){
			var mt = attributes.match(/([a-z0-9]+)=((\"([^\"]+)\")|(\'([^\'+])\'))\s*/gi);
			for(var g,i=0; g=mt[i],i<mt.length; i++){
				g = g.split('=');
				attrJson[g[0]] = g[1].replace(/^\s*[\"\']/g, '').replace(/[\"\']\s*$/g, '');
			}
		}
		return attrJson;
	}

	function init(editorPnl, config, docText){
		var templates = {
			marker: function(name, attributes, closing){
				var sz = Settings.marker.size;
				var attrJson = JSON.stringify(parseAttributes(attributes))
					.replace(/\"/gi, '&quot;');

				return $C.html.canvas({
					'class':'marker',
					width:px(sz.w), height: px(sz.h),
					'data-name':name,
					'data-closing':!!closing,
					'data-attributes':attrJson
				});
			},
			markerDraw: function(el, highlight){
				if(!el) return;
				var sz = {}; $C.extend(sz, Settings.marker.size);
				var name = $(el).attr('data-name'),
					closing = $(el).attr('data-closing')=='true',
					unclosed = $(el).attr('data-unclosed')=='true';
				var ctx = el.getContext('2d');
				var label = name;

				var def = editorPnl.tagsByName[name];
				el.tagDef = def; 
				console.assert(def, 'No tagDef for %o', el);

				if(def&&def.label) label = def.label.text;

				var lblSize = label.length*Settings.marker.fontSize;
				if(lblSize>sz.w-sz.arrow) sz.w = lblSize+sz.arrow;

				el.setAttribute('width', sz.w);
				ctx.clearRect(0, 0, sz.w, sz.h);
				ctx.fillStyle = 
					unclosed?Settings.marker.bgColor.error
						:highlight?Settings.marker.bgColor.hi
						:Settings.marker.bgColor.lo;
				ctx.beginPath();
				if(def.selfClosing){
					ctx.rect(0, 0, sz.w, sz.h);
				}
				else if(closing){
					ctx.moveTo(sz.arrow, 0);
					ctx.lineTo(sz.w, 0);
					ctx.lineTo(sz.w, sz.h);
					ctx.lineTo(sz.arrow, sz.h);
					ctx.lineTo(0, sz.h/2);
				}
				else{
					ctx.moveTo(0, 0);
					ctx.lineTo(sz.w - sz.arrow, 0);
					ctx.lineTo(sz.w, sz.h/2);
					ctx.lineTo(sz.w - sz.arrow, sz.h);
					ctx.lineTo(0, sz.h);
				}
				ctx.fill();

				ctx.fillStyle = highlight?Settings.marker.color.hi
						:Settings.marker.color.lo;
				ctx.font = px(Settings.marker.fontSize)+' Verdana, Arial, Sans-Serif';
				ctx.textAlign = css.center;
				ctx.fillText(label, sz.w/2, sz.h*.8);
				
			}
		};

		function selectValue(val, command){
			var el = $('.fluegel .fluegelClipboard textarea')[0];
			el.value = val;
			el.setAttribute('readonly', '');
			el.select();
			el.setSelectionRange(0, el.value.length);
			el.removeAttribute('readonly');
			var selectedText = el.value;
			var successful = document.execCommand(command);
		}

		editorPnl.addClass('fluegel')
			.html((function(){with($H){
				return markup(
					div({'class':'fluegelButtonsPanel'}),
					div({'class':'fluegelEditor', contenteditable:true}),
					div({'class':'fluegelClipboard'}, textarea())
				);
			}})())
			.bind('copy', function(ev){
				ev.stopPropagation();
				var sel = getCodeSelection();
				if(!sel) return;
				selectValue(sel.textInner, 'copy');
			})
			.bind('cut', function(ev){
				ev.stopPropagation();
				var sel = getCodeSelection();
				if(!sel) return;
				selectValue(sel.textInner, 'cut');
				setText(sel.textBefore+sel.textAfter);

			})
			.bind('paste', function(ev){
				ev.stopPropagation();
				setTimeout(function(){
					setText(harvest(null, false));
				}, 20);
			})
		;

		function insertMarkers(docText){
			return docText.replace(/<(\/)?([a-z0-9]+)(\s+([^\/>]*))?(\/)?>/gi, function(str, closing, name, grp3, attributes, selfClosing){
				// console.log(name, attributes);
				return templates.marker(name, attributes, closing);
			});
		}

		function drawButtons(){
			if(!config.doctype) return;
			editorPnl.tagDefinitions = [];
			editorPnl.tagsByName = {};
			for(var t,i=0; t=config.doctype[i],i<config.doctype.length; i++){
				t.id = editorPnl.tagDefinitions.length;
				editorPnl.tagDefinitions.push(t);
				editorPnl.tagsByName[t.tag] = t;
			}

			$(editorPnl).find('.fluegelButtonsPanel')
				.html((function(){with($H){
					return apply(config.doctype, function(t){
						return button({'class':'tagButton', 
								'data-tagID':t.id
							},
							t.description?{title:t.description}:null,
							t.label?
								t.label.style?{style:t.label.style}:null
								:null,
							t.label && t.label.text?t.label.text:t.tag
						);
					});
				}})())
				.find('.tagButton').click(function(){
					selectWith(
						editorPnl.tagDefinitions[
							parseInt($(this).attr('data-tagID'))
						]
					);
				}).end()
			;
		}
		drawButtons();

		function drawMarkers(){
			$(editorPnl).find('.marker').each(function(i, el){
				templates.markerDraw(el);
				setEventHandlers(el);
			});
		}

		function setEventHandlers(el){
			var def = el.tagDef;
			console.assert(def, 'No tag definition for %o', el);
			if(!def) return;
			if(def.attributes) $(el).css({cursor:css.pointer}).click(function(){
				// console.log('clicked at ', new Date());
				openDialog(el);
			});
		}

		function openDialog(el){
			var def = el.tagDef;
			console.assert(def, 'No tag definition for %o', el);
			if(!def) return;

			var dlgID = 'fluegelAttributeDialog';

			function fill(dlg){
				var attributes = $(el).attr('data-attributes');
				if(attributes) attributes = JSON.parse(attributes.replace('&quot;', '"'));
				dlg.find('.dlgBody .dlgContent').html((function(){with($H){
						return table(
							apply(def.attributes, function(att, nm){
								return tr(
									td(att.label),
									td(
										input({
											'class':'tbAttrValue',
											'data-attrName':nm,
											type:'text', 
											value:attributes[nm]
										})
									)
								);
							})
						);
					}})())
				;
			}

			function close(dlg){
				dlg.fadeOut(200);
			}

			var dlg = $('#'+dlgID);
			if(!dlg.length){
				dlg = $((function(){with($H){
						return div({id:dlgID},
							div({'class':'dlgBody'},
								div({'class':'dlgHeader'}, 'Атрибуты тега'),
								div({'class':'dlgContent'}),
								div({'class':'dlgButtons'},
									button({'class':'btSave'}, 'Сохранить'),
									button({'class':'btClose'}, 'Отмена')
								)
							)
						);
					}})())
					.click(function(){
						close($(this));
					})
					.find('.dlgBody').click(function(ev){
						ev.stopPropagation();
					}).end()
					.find('.btClose').click(function(){
						close($(this).parent().parent().parent());
					}).end()
					.find('.btSave').click(function(){
						var attrJson = {};
						dlg.find('.tbAttrValue').each(function(i, fld){fld=$(fld);
							var nm = fld.attr('data-attrName'),
								val = fld.val();
							attrJson[nm] = val;
						});
						attrJson = JSON.stringify(attrJson).replace(/\"/gi, '&quot;');
						$(el).attr({'data-attributes': attrJson});
						close($(this).parent().parent().parent());
					}).end()
				;
				$('body').append(dlg);
			}
			fill(dlg);
			dlg.fadeIn();
		}

		function selectWith(def){
			var tagName = def.tag,
				selfClosing = def.selfClosing;

			var selection = window.getSelection();
			if(!selection.rangeCount) return;
			var bgn = selection.getRangeAt(0),
				end = selection.getRangeAt(selection.rangeCount-1);

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
				var txt = node.nodeValue;
				if(!txt) return;
				var t1 = txt.slice(0, pos1),
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
				cnv.tagDef = def;
				node.parentNode.insertBefore(cnv, node);
				templates.markerDraw(cnv, false);
				setEventHandlers(cnv);
				$(cnv).mouseover(function(){
					highlightOpposite($(this));
				}).mouseout(function(){
					highlightOpposite($(this), true);
				});
			}

			if(selfClosing){
				insertTag(bgn.startContainer, bgn.startOffset, tagName, false);
			}
			else if(bgn.startContainer==bgn.endContainer){
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

			setOpposites();
		}

		function highlightOpposite(marker, hide){
			templates.markerDraw(marker[0], !hide);
			templates.markerDraw(marker[0].opposite, !hide);
			
		}

		function setOpposites(){
			var path = [];
			editorPnl.find('.marker').each(function(i, mrk){mrk=$(mrk);
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


		setText(docText);

		function setText(docText){
			editorPnl.find('.fluegelEditor')
				.html(insertMarkers(docText))
				.find('.marker').mouseover(function(){
					highlightOpposite($(this));
				}).mouseout(function(){
					highlightOpposite($(this), true);
				}).end()
			;

			drawMarkers();

			setOpposites();
		}

		function getCodeSelection(){
			var code = harvest(null, true);

			var selection = window.getSelection();
			// console.log(selection.rangeCount);
			if(selection.rangeCount<1) return;

			var bgn = selection.getRangeAt(0),
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
			// console.log('Selection: %o', res);
			return res;
		}

		function harvest(node, insertIDs){
			node = node || editorPnl.find('.fluegelEditor')[0];
			var def = node.tagDef;
			switch(node.nodeName){
				case 'CANVAS':
					var nd = $(node),
						nm = nd.attr('data-name'),
						cls = nd.attr('data-closing')=='true';
					var attr = [];
					var attrColl = JSON.parse(nd.attr('data-attributes').replace(/&quot;/gi, '"'));
					for(var attNm in attrColl){
						var val = attrColl[attNm];
						val = val.replace(/\"/, '\"');
						attr.push(attNm+'='+'"'+val+'"');
					}
					attr = attr.join(' ');
					if(attr.length) attr = ' '+attr;
					return [
						'<',
						cls?'/':'',
						,nm,
						attr,
						def.selfClosing&&config.xmlMode?'/':'',
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
})(jQuery, Clarino.version('1.0.1'));
