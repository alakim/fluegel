(function($, $C){

	var Settings = {
		size: {w: 800, h:200},
		button:{
			size:30
		},
		color:{
			dialogShield:'rgba(0, 0, 0, .75)',
			text:'#222',
			white:'#fff',
			attention: '#f08'
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
				border: $C.css.template.border(1, '#888'),
				padding: px(1, 5),
				' button':{
					background: '#ccc',
					border: $C.css.template.border(1, '#888'),
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
				border: $C.css.template.border(1, '#ccc'),
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
					borderBottom: $C.css.template.border(1, Settings.color.text),
					marginBottom:px(5)
				},
				' .dlgContent':{
					padding: px(10),
					minHeight: px(200)
				},
				' .dlgButtons':{
					borderTop: $C.css.template.border(1, Settings.color.text),
					padding:px(8, 50),
					display: css.flex,
					flexDirection: css.row,
					justifyContent: css.spaceAround,
					' button':{
						fontSize:px(16),
						backgroundColor: '#eee',
						border:$C.css.template.border(1, Settings.color.text),
						borderRadius: px(3),
						'.btDel':{
							color: Settings.color.attention,
							borderColor: Settings.color.attention
						}
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

	var regex = (function(){
		function regex(parts, flags){
			var src = [];
			var groups = [];
			for(var p,i=0; p=parts[i],i<parts.length; i++){
				src.push(p instanceof RegExp?p.source:p)
				if(p.group_name) groups.push(p.group_name);
			}
			var reg = new RegExp(src.join(''), flags);
			var grpIdx = {};
			for(var g,i=0; g=groups[i],i<groups.length; i++){
				grpIdx[g] = i+1;
			}
			reg.groups = grpIdx;

			return reg;
		};
		regex.group = function(name, re, quant){
			var rrr = new RegExp([
				'(', re.source, ')', quant
			].join(''));
			rrr.group_name = name;
			return rrr;
		};
		return regex;
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
				closing = !!closing;
				//console.log(name, closing);
				var sz = Settings.marker.size;
				var def = editorPnl.tagsByName[name];
				var attrJson = JSON.stringify(parseAttributes(attributes))
					.replace(/\"/gi, '&quot;');

				return (closing?'':('<span class="tag_'+name+'">'))
					+$C.html.canvas({
						'class':'marker tag_marker_'+name,
						width:px(sz.w), height: px(sz.h),
						'data-name':name,
						'data-closing':closing,
						'data-attributes':attrJson
					})
					+(closing||def.selfClosing?'</span>':'')
				;
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
 
		var reMarker = new regex([
			/</,
			regex.group('closing', /\//, '?'),
			regex.group('tagName', /[a-z0-9]+/),
			'(\\s+',
			regex.group('tagAttributes', /([a-z0-9\_\-]+\=\"[^\"]+\"\s*)*/), 
			')?',
			regex.group('closed', /\//, '?'),
			/>/
		], 'gi');

		function insertMarkers(docText){
			return docText.replace(reMarker, function(){
				var closing = arguments[reMarker.groups['closing']],
					name = arguments[reMarker.groups['tagName']],
					attributes = arguments[reMarker.groups['tagAttributes']];
				return templates.marker(
					arguments[reMarker.groups['tagName']],
					arguments[reMarker.groups['tagAttributes']],
					arguments[reMarker.groups['closing']]
				);
			});
		}

		function refresh(){
			var res = harvest();
			init(editorPnl, config, res);
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
					return markup(
						button({'class':'btRefresh'}, 'Refresh'),
						apply(config.doctype, function(t){
							return button({'class':'tagButton', 
									'data-tagID':t.id
								},
								t.description?{title:t.description}:null,
								t.label?
									t.label.style?{style:t.label.style}:null
									:null,
								t.label && t.label.text?t.label.text:t.tag
							);
						})
					);
				}})())
				.find('.btRefresh').click(refresh).end()
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
			$(el).css({cursor:css.pointer}).click(function(){
				openDialog(el);
			});
		}

		function openDialog(el){
			var opposite = el.opposite;
			if(opposite && $(opposite).attr('data-closing')!='true'){
				var ee = el;
				el = opposite;
				opposite = ee;
			}
			var def = el.tagDef;
			console.assert(def, 'No tag definition for %o', el);
			if(!def) return;

			var dlgID = 'fluegelAttributeDialog';

			function fill(dlg){
				var attributes = $(el).attr('data-attributes');
				//console.log(attributes, typeof(attributes), attributes.length);
				if(attributes){
					attributes = attributes.replace(/&quot;/gi, '"');
					attributes = JSON.parse(attributes);
				}
				else{
					attributes = {};
				}

				dlg
					.find('.dlgBody .dlgContent').html((function(){with($H){
						return table(
							apply(def.attributes, function(att, nm){
								return tr(
									td(att.label),
									td(
										input({
											'class':'tbAttrValue',
											'data-attrName':nm,
											type:'text', 
											value:attributes[nm] || ''
										})
									)
								);
							})
						);
					}})()).end()
					.find('.tagName').html(def.description).end()
					.find('.btSave')
						.unbind('click')
						.click(function(){
							var attrJson = {};
							dlg.find('.tbAttrValue').each(function(i, fld){fld=$(fld);
								var nm = fld.attr('data-attrName'),
									val = fld.val();
								attrJson[nm] = val;
							});
							attrJson = JSON.stringify(attrJson).replace(/\"/gi, '&quot;');
							$(el).attr({'data-attributes': attrJson});
							close($(this).parent().parent().parent());
						})
						.each(function(i, bt){
							if(!(def && def.attributes)) $(bt).hide();
							else $(bt).show();
						})
					.end()
					.find('.btDel').unbind('click').click(function(){
						if(confirm('Удалить этот тег?')){
							el.remove();
							if(opposite) opposite.remove();
							refresh();
							close($(this).parent().parent().parent());
						}
					}).end()
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
								div({'class':'dlgHeader'}, 'Тег "', span({'class':'tagName'}),'"'),
								div({'class':'dlgContent'}),
								div({'class':'dlgButtons'},
									button({'class':'btSave'}, 'Сохранить'),
									button({'class':'btDel'}, 'Удалить'),
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
				var mrk = insertMarker(node, name, closing)
				node.parentNode.insertBefore(document.createTextNode(txtAfter), node);
				node.parentNode.removeChild(node);
				$(mrk).wrap($H.span({'class':'tag_'+name}));
			}

			function insertTagsPair(node, pos1, pos2, name){
				var txt = node.nodeValue;
				if(!txt) return;
				var t1 = txt.slice(0, pos1),
					t2 = txt.slice(pos1, pos2),
					t3 = txt.slice(pos2, txt.length);
				//console.log(t1, t2, t3);

				node.parentNode.insertBefore(document.createTextNode(t1), node);
				var mrk1 = insertMarker(node, name);
				node.parentNode.insertBefore(document.createTextNode(t2), node);
				var mrk2 = insertMarker(node, name, true);
				wrapBetween(mrk1, mrk2, name);
				node.parentNode.insertBefore(document.createTextNode(t3), node);
				node.parentNode.removeChild(node);
			}

			function wrapBetween(m1, m2, name){
				var tsp = document.createElement('span');
				tsp.setAttribute('class','tag_'+name);
				m1.parentNode.insertBefore(tsp, m1);
				var coll = [m1], n = m1;
				while(n!=m2){
					n = n.nextSibling;
					coll.push(n);
				}
				for(var n,i=0; n=coll[i],i<coll.length; i++){
					tsp.appendChild(n);
				}
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
				return cnv;
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
				refresh(); // temporary solution
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

		function applyParsers(docText, config){
			var parsers = [];
			function collectParsers(doctype){
				// for(var tagNm in doctype){
				for(var tagDef,i=0; tagDef=doctype[i],i<doctype.length; i++){
					// var tagDef = doctype[tagNm];
					if(tagDef.parser) parsers.push(tagDef.parser);
					if(tagDef.children) collectParsers(tagDef.children);
				}
			}
			collectParsers(config.doctype);
			for(var prs,i=0; prs=parsers[i],i<parsers.length; i++){
				docText = prs(docText);
			}
			return docText;
		}

		setText(docText);

		function setText(docText){
			docText = applyParsers(docText, config);
			console.log('Set text: %s', docText);
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
					var attrColl = nd.attr('data-attributes');
					if(attrColl){
						attrColl = JSON.parse(attrColl.replace(/&quot;/gi, '"'));
						for(var attNm in attrColl){
							var val = attrColl[attNm];
							val = val.replace(/\"/, '\"');
							attr.push(attNm+'='+'"'+val+'"');
						}
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
})(jQuery, Clarino.version('1.1.0'));
