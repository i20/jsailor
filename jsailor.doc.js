var listing = function(key){
			
	var content = '<ul>', 
		listable = false,
		val = eval(key);
	
	if( !(S.Test.isString(val) || S.Test.isArray(val)) ){
		
		S.Object.each( val , function(sub){
			
			//empeche l'affichage inopportun des prototype
			//de plus opera affichait egalement les prototypes des fonctions
			if(sub !== 'prototype'){
				
				//exemple JSailor est soi disant listable mais comme il n'y a que prototype et
				//que ce dernier n'est pas montre on fait comme s'il s'agissait d'une fonction
				listable = true;
						
				content += '<li><span class="off" alt="' + key + '">' + sub + '</span></li>';
			}
		});
	}
		
	display(key);	
			
	if(listable)
		return content + '</ul>';	
},

display = function(key, nothist){
	
	//window.location.href = '#';
	document.title = 'Doc JSailor - Chargement...';
	S('#corps').html('Chargement du document en cours...');
	
	if(!nothist){
		
		var newhist = {};
		
		S.Object.each(hist.stock, function(j, sheet){
			
			if(j <= 0)
				newhist[j-1] = sheet;
		});
		
		hist.stock = newhist;
		hist.stock[0] = key;
		
		hist.rebuild();
	}
	
//	$.ajax({
//	   
//	   url: 'sheets/' + key + '.html',
//	   
//	   ifModified: true,
//	   
//	   success: function(html){
//		
//    		document.title = 'Doc JSailor - ' + key;
//    		
//    		S('#corps').html(html);
//	   }
//	});
	
	S.Ajax.get('sheets/' + key + '.html', { /*cache: 'isset',*/ jscontext: '#corps' }, function(html){
		
		document.title = 'Doc JSailor - ' + key;
		
		S('#corps').html(this.status === 404 ? 'Page en construction' : html);
	});
},

search = function(val){
	
	try{ 
					
		eval(val);
		display(val);
	}
	catch(e){ S('#corps').html('Votre recherche ne renvoie aucun résultat.'); }
},

hist = {
	
	stock: {},
	
	previous: function(){ this.go(-1); },
	
	next: function(){ this.go(1); },
	
	go: function(pos){
		
		display(this.stock[pos], true);
		
		var newhist = {};
		
		S.Object.each(this.stock, function(j, sheet){
			
			newhist[j - pos] = sheet;
		});
		
		this.stock = newhist;
		
		this.rebuild();
	},
	
	rebuild: function(){
		
		var histlist = S('select').html('');
		
		S.Object.each(this.stock, function(i, sheet){
			
			histlist.append('<option value="' + i + '">' + sheet + '</option>');
		});
	}
};

S(function(){
	
	S.Ajax.get('keywords.json', { response: 'json' }, function(keywords){

		var pos = {},
		suggestul = S('#research > :text').each(function(){
		
			pos.x = S(this).left(),
			pos.y = S(this).top() + S(this).height(),
			pos.w = S(this).width();
		
		}).keyup(function(event){
				
			var val = S(this).value();
				
			if(event.keyCode === 13)
				search(val);
			
			else{
				
				var input = this,
					root = val.substring(0, val.lastIndexOf('.')),
					prop = val.substring(val.lastIndexOf('.') + 1);
				
				suggestul.html('');
				
				if(val){
					
					try{
						
						if( val.indexOf('.') === -1 )
							throw 'keyword';
						
						S.Object.each(eval(root), function(key, code){
						
							if( new RegExp('^' + prop).test(key) && key !== 'prototype'){ 
								
								suggestul.append('<li>' + key + '</li>').hover(function(){
								
									S(this).css('color', 'blue');
									
									S(input).value(root + '.' + key);
								
								}, function(){
								
									S(this).css('color', 'black');
								});
							}
						});
					}
					catch(e){
						
						S.Object.each(keywords, function(key, corr){
								
							if( new RegExp(' (' + val + '[^ ]*) ').test(' ' + key + ' ') ){
								
								suggestul.append('<li>' + corr.join('</li><li>') + '</li>').hover(function(){
								
									S(this).css('color', 'blue');
									
									S(input).value( S(this).html() );
								
								}, function(){
								
									S(this).css('color', 'black');
								});
							}
						});
					}
				}
			
				suggestul.css('display', suggestul.children().length ? '' : 'none');
			}
			
		}).follow('<ul></ul>').css({
			
			'display': 'none',
			'position': 'absolute',
			'top': pos.y,
			'left': pos.x,
			'width': pos.w,
			'border': '1px solid red',
			'background-color': 'white'
			
		});
	});
	
	S('.current_version').live(function(){
	   
	   S(this).html('1.1.6');
	});
	
	S('#research > :button').click(function(){ search( S(this).olders(':text').value() ); });
	
	S('select').change(function(){
		
		hist.go( parseInt(S(this).value()) );
	});
			
	S('.off').livebind('click', function(){
				
        var e = S(this),
			alt = e.alt(),
			list = listing( (alt ? alt + '.' : '') + e.html() );
				
		//e.attr('class', 'on'); ne pas faire car IE ne met pas à jour .className lorsqu'on change
		//la valeur de l'attribut class="" ultérieurement
		e.switchClass('off', 'on');
		
		if(list)
			e.follow(list);
	});
			
	S('.on').livebind('click', function(){
				
		//S(this).attr('class', 'off').next().remove(); idem précédemment
		S(this).switchClass('on', 'off').next().remove();
	});
	
	//declenche le premier listage de S
	S('.off').click();	
});