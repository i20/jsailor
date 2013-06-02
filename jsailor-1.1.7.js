/*
 * JSailor JavaScript Library
 *
 * Version 1.1.7
 * Copyright 2012 Yvain Giffoni
 *
 * Date: 2012-12-07 20:42:51 (Fri, 07 Dec 2012)
 *
 * Special thanks to John Resig, Dean Edwards and the Sizzle project's team
 * who helped me to understand the depths of JavaScript!
 *
 */

(function(container, window, undefined){

    var document = window.document,
        location = window.location,
        navigator = window.navigator,

        Math = window.Math,
        Date = window.Date,
        RegExp = window.RegExp,

        parseInt = window.parseInt,
        parseFloat = window.parseFloat,

        setTimeout = window.setTimeout,
        setInterval = window.setInterval,
        clearInterval = window.clearInterval,
        isNaN = window.isNaN;

    var Support = {

        computedStyle: 'getComputedStyle' in window,
        querySelector: 'querySelectorAll' in document,
        defaultView: 'defaultView' in document
    };

    (function(){

        var element = document.createElement('div'),
			frag = document.createDocumentFragment();
		
		//si on attache pas l'element temporaire a un fragment .currentStyle chez IE reste null
		frag.appendChild(element);
		
        Support.elementFocus = 'childElementCount' in element;
        Support.textContent = 'textContent' in element;

        var style = Support.computedStyle ? window.getComputedStyle(element, null) : element.currentStyle;

		Support.cssFloat = 'cssFloat' in style;
        Support.opacity = 'opacity' in style;

    })();

    //Extended Selectors qui ne sont pas pris en charge par querySelectorAll
    //ES = ['@', '!='],

    var S = function(expr){ return new S.JSailor(expr); },

    Fl = function(list, fn){

        var length = list.length;

        for(var i = 0; i < length; i++)
            if(fn.call(list[i], i, list[i]) === false)
                break;
    },

    Fi = function(obj, fn, parse){

        var rnumber = Rex.rnumber;

        for(var i in obj)
            //les i sont toujours des string meme avec un array
            if(obj.hasOwnProperty(i) && fn.call(obj[i], parse && rnumber.test(i) ? i - 0 : i, obj[i]) === false)
                break;
    },

    Error = function(texte){ throw 'JSailorError: ' + texte; },

    Eval = {

        clean: function(expr){

            //supprime les espaces inutiles
            expr = S.String.singleSpaces(expr)
                .replace(/^\s|\s$/g, '')
                .replace(new RegExp(' ?([' + Rex.srshort + Rex.srcss3 + '()]) ?', 'g'), '$1');

            //decapsulation, la ) doit correspondre a celle de debut sinon cas S('(...)|(...)')
            if(/^\(.+\)$/.test(expr) && S.String.indexOfEndingBracket(0, expr) === expr.length - 1)
                expr = expr.substring(1, expr.length - 1);

            return expr;
        },

        split: function(expr){

            var ishort, icss3, ifilter,
                npar, ncro,
                //early binding
                rshort = new RegExp('[' + Rex.srshort + ']'),
                rcss3 = new RegExp('[' + Rex.srcss3 + ']'),
                rfilter = new RegExp('[' + Rex.srfilter + ']'),
                char;

            ishort = icss3 = ifilter = -1,
            npar = ncro = 0;

            //tester le 1er char n'est pas necessaire
            for(var i = expr.length - 1; i > 0; i--){

                char = expr.charAt(i);

                switch(char){

                    case ')': npar++; break;
                    case '(': npar--; break;
                    case ']': ncro++; break;
                    case '[': ncro--; //pas de break car [ est un filter!
                    default:

                        if( !(npar || ncro) ){

                            if( rshort.test(char) && ishort < 0 ) ishort = i;
                            else if( rcss3.test(char) && icss3 < 0 ) icss3 = i;
                            else if( rfilter.test(char) && ifilter < 0 ) ifilter = i;

                            if(ishort + 1 && icss3 + 1 && ifilter + 1) break;
                        }
                }
            }

            return [ishort, icss3, ifilter];
        },

        filter: function(expr, root, logic, uniq){

            if( S.Test.isString(expr) ){

                expr = this.clean(expr);

                //.filter('#â€¦')
                if( Rex.rsimple.test(expr) ){

                    //exit direct cas trivial utile pour .and(expr || '*')
                    if(expr === '*')
                        return logic ? root : S();

                    return this.filter( (function(){

                        switch( expr.charAt(0) ){

                            case '#':

                                var value = expr.substring(1);

                                uniq = true;

                                return function(){ return this.id == value; };

                            break;

                            case '.':

                                var value = expr.substring(1),
                                    oDom = S.Dom;

                                return function(){ return oDom.hasClass(this, value); };

                            break;

                            case '@':

                                var value = expr.substring(1);

                                return function(){ return this.getAttribute('name') == value; };

                            break;

                            case ':':

                                var index_par = expr.indexOf('('),
                                    oFilter = S.Filter;

                                if( index_par + 1 ){

                                    var fn = S.String.camelCase(expr.substring(1, index_par), '-'),
                                        args = expr.substring(index_par + 1, expr.length - 1);

                                    return function(){ return oFilter[fn](this, args); };
                                }

                                else{

                                    var fn = S.String.camelCase(expr.substring(1), '-');

                                    return function(){ return oFilter[fn](this); };
                                }

                            break;

                            case '[':

                                var index_egal = expr.indexOf('=');

                                if( index_egal + 1 ){

                                    var value = expr.substring(index_egal + 1, expr.length - 1);

                                    switch( expr.charAt(index_egal - 1) ){

                                        case '^':

                                            var attr = expr.substring(1, index_egal - 1),
                                                reg = new RegExp('^' + value);

                                            return function(){ return reg.test(this.getAttribute(attr)); };

                                        break;

                                        case '$':

                                            var attr = expr.substring(1, index_egal - 1),
                                                reg = new RegExp(value + '$');

                                            return function(){ return reg.test(this.getAttribute(attr)); };

                                        break;

                                        case '*':

                                            var attr = expr.substring(1, index_egal - 1),
                                                reg = new RegExp(value);

                                            return function(){ return reg.test(this.getAttribute(attr)); };

                                        break;

                                        case '~':

                                            var attr = expr.substring(1, index_egal - 1),
                                                oString = S.String;

                                            return function(){ return oString.inList(value, this.getAttribute(attr), ' '); };

                                        break;

                                        case '|':

                                            var attr = expr.substring(1, index_egal - 1),
                                                oString = S.String;

                                            return function(){ return oString.inList(value, this.getAttribute(attr), '-'); };

                                        break;

                                        case '!':

                                            var attr = expr.substring(1, index_egal - 1);

                                            return function(){ return this.getAttribute(attr) != value; };

                                        break;

                                        default:

                                            var attr = expr.substring(1, index_egal);

                                            return function(){ return this.getAttribute(attr) == value; };
                                    }
                                }

                                else{

                                    var attr = expr.substring(1, expr.length - 1);

                                    return function(){ return this.hasAttribute(attr); };
                                }

                            break;

                            default:

                                var tag = expr.toUpperCase();

                                return function(){ return this.nodeName === tag; };
                        }

                    })(), root, logic, uniq );
                }

                //not() n'utilise jamais cette partie
                else{

                    var indexes = this.split(expr);

                    /*!(e1 & e2) = !e1 | !e2
                    !(e1 | e2) = !e1 & !e2
                    !(e1 ! e2) = !(e1 & !e2) = !e1 | e2
                    !(e1 ^ e2) = (!e1 & !e2) | (e1 & e2)
                               = !(e1 | e2) | !(!e1 | !e2)
                               = !(y1 & y2)    y1=(e1 | e2)  y2=(!e1 | !e2)
                               = !y1 | !y2
                               = (!e1 & !e2) | ...*/

                    //.filter('...|...')
                    if(indexes[0] + 1)

                        return root.and( expr.substring(0, indexes[0]) )[ Short[expr.charAt(indexes[0])] ]( root.and( expr.substring(indexes[0] + 1) ) );


                    //.filter('...~...')
                    else if(indexes[1] + 1){

                        var meth = CSS3.and[expr.charAt(indexes[1])],
                            before = expr.substring(0, indexes[1]);

                        //inversement par rapport a descendants()
                        return root.and( expr.substring(indexes[1] + 1) ).and(function(){ return S(this)[meth](before).length; });
                    }

                    //.filter('...#...')
                    else

                        return root.and( expr.substring(0, indexes[2]) ).and( expr.substring(indexes[2]) );

                }
            }
            //fonction predicat
            else{

                var res = [];

                root.each(function(){
                    //simple ==  car souvent on ne mettra rien pour false
                    if(expr.call(this) == logic){

                        res.push(this);

                        return !uniq;
                    }
                });

                return S(res);
            }
        }
    },

    Cache = {

        ajax: {

            //taille en octets du cache
            size: 0,

            resources: {

                /*url: {

                    date: ,
                    size: ,
                    access: ,
                    lastModified: ,
                    etag: ,
                    content:
                },
                ...*/
            }
        },

        jsailor: {

            empty: true,

            selectors: {

                /*regexp: S(regexp),
                ...*/
            }
        }
    },

    //backup des styles des elements pour slideUp, slideDown etc
    Style = {


    },

    Rex = {

        rnth: /^(-?\d+)(?:n([+-]\d+)?)?$/,

        rpixel: /^-?\d+(?:px)?$/i,

        rinput: /^(?:input|button|textarea|select)$/i,

        //3, -3, 3., 3.5, .5
        rnumber: /^-?(?:\d+(?:\.\d*)?|\.\d+)$/,

        rboolean: /^(?:true|false)$/,

        runit: /(px|pt|pc|%|em|ex|cm|mm|in|deg)$/,

        rope: /^[-+*\/%^]\s/,

        rcssspecialprop: /^(?:height|width|left|top|scroll(?:Top|Left))$/,

        rcolor: /(?:rgb|hs[lv]|cmyk)a?/,

        ralpha: /alpha\(opacity=(\d*)\)/,

        rspecialevent: /^(?:hatch|die)$/,

        //urls contenant des identifiants de connexion
        rurlog: /^([a-z]+):\/\/([^:]+):([^:]+)@/i,

        remail: /^[a-z0-9_.-]+@(?:[a-z0-9_-]+\.)+[a-z]{2,4}$/i,

        rmarkupext: /^(?:xml|rss|atom|html?)$/i,

        //extension pages web dynamiques php, java, asp, coldfusion
        //attention il peut y avoir des variable GET donc pas de $
        rdynext: /^(?:php\d?|jsp|as[pc]x?|cf[mc])/i,

        rlocal: /(?:file|-extension):$/,

        rbrowser: /safari|firefox|opera|msie/,

        srshort: '!&|,^',

        srcss3: '> +~',

        //le double \\ sur les meta-chars est necessaire pour creer une regexp a partir d'une chaine
        srfilter: '#.@\\[:'
    },

    Life = {

        id: -1,

        stock: {},

        active: function(regexp, type, handlerId){
            
            //console.log('Active for ' + regexp + ' on ' + type + ' from ' + arguments.caller);

            var regexpdata = this.stock[regexp],
                mutationdata = regexpdata.mutation,
                data = regexpdata[type][handlerId];

            //les donnees ne correspondent pas a la mutation courante
            //-------------------------------------------------------------------------------------
            //attention cette mise a jour doit etre effectuee avant toute execution de .fire()
            //car si ladite fonction contient une instruction .css(), .prop(), .attr() ou .remove() alors elle
            //reexecute immediatement Life.active() sans laisser le temps au set d'etre mis a jour creant ainsi une
            //merveilleuse boucle infine! Ce bug n'est visible que dans le cas de IE et Opera car pour les W3C
            //le mutationevent DOMSubtreeModified se declenche bien apres la fin de Life.active() et donc laisse
            //le temps au set d'etre change
            if(mutationdata.id !== this.id){

                var set = S(regexp);

                mutationdata.id = this.id;
                mutationdata.newels = set.not(mutationdata.set);
                mutationdata.expels = mutationdata.set.not(set);
                //a faire apres newels et expels qui ont besoin de l'ancien set
                mutationdata.set = set;
            }

            if(type === 'hatch')
                mutationdata.newels.each(data.action);

            else if(type === 'die')
                mutationdata.expels.each(data.action);

            //types simples(click, etc...)
            else{

                mutationdata.newels.bind(type, data.action);
                mutationdata.expels.unbind(type, data.action);
            }
        }
    },

    Fx = {

        id: -1,

        stock: {},

        anims: {},

        addAnim: function(delay, method, callback){

            this.anims[++this.id] = {

                //nb d'elements executant encore cette anim
                length: 0,
                //infos attachee a l'anim
                delay: delay,
                method: method,
                start: S.Time.now(),
                callback: callback
            };
        },

        addAnimExecuter: function(){

            this.anims[this.id].length++;
        },

        //memoire des proprietes css sous forme de ratio
        sratio: 'opacity zoom',

        cssToJsProp: (function(){

            var cssprop = (Support.cssFloat ? 'css' : 'style') + 'Float';

            return function(prop){

                return prop === 'float' ? cssprop : S.String.camelCase(prop, '-');
            };

        })(),

        //determine les valeurs relatives
        getFinalValue: function(from, ope, to){

            return  ope === '+' ? from + to :
                    ope === '-' ? from - to :
                    ope === '*' ? from * to :
                    ope === '/' ? from / to :
                    ope === '%' ? from % to :
                    ope === '^' ? Math.pow(from, to):
                    ope === '~' ? S.Math.round(from, to) :
                    to;
        },

        //Les 2 fonctions evalue... permettent la gestion des valeurs relatives pour .tune() et .css(),
        //on pourrait croire que seul .css() a besoin de faire ce traitement puisque c'est lui qui est utilise
        //dans .tune() pour changer le style mais .tune() a aussi besoin de connaitre la valeur finale
        //absolue pour calculer les etapes et la temporisation des animations.
        //-------------------------------------------------------------------------------------
        //evalGeneral() decoupe la valeur donnee et prepare les infos pour evalFor() qui utilise ces infos
        //pour generer la valeur finale pour chaque element
        evalGeneral: function(prop, to){

            to += '';

            var ope, type, unit;

            if(Rex.rope.test(to)){

                ope = to.charAt(0);
                to = to.substring(2);
            }

            if(Rex.runit.test(to)){

                unit = RegExp.$1;
                type = 1;
            }
            else if(Rex.rnumber.test(to))
                if(S.String.inList(prop, this.sratio, ' '))
                    type = 3;
                else
                    type = 2;
            else if( /color/i.test(prop) )
                type = 4;
            else
                type = 5;

            //chiffre avec unite (px, mm, ...) = 1
            //chiffre quelconque = 2
            //chiffre ratio (opacity, zoom, ...) = 3
            //couleur = 4
            //valeur textuelle quelconque = 5

            return {

                type: type,
                ope: ope,
                unit: unit,
                value: (type < 4 ? parseFloat(to) : to)
            };
        },

        evalFor: function(elt, prop, infos, tune){

            var from;

            //permet d'eviter des calculs inutiles dans le cas d'une valeur simple (ne necessitant pas de calculs)
            if(infos.ope || (tune && infos.type < 5)){

                prop = this.cssToJsProp(prop),
                from = Rex.rcssspecialprop.test(prop) ? S(elt)[prop]() :
                       infos.type < 4 ? parseFloat(S(elt).css(prop)) :
                       //couleur
                       S(elt).css(prop);

                if(infos.type === 1)
                    from = S.Css.convertSize(from, 'px', infos.unit, elt, prop);
            }

            return {

                from: from,
                to: Fx.getFinalValue(from, infos.ope, infos.value)
            };
        },

        active: function(elementId, prop){

            var eltdata = this.stock[elementId],

                data = eltdata.prop[prop],
                from = data.from,
                to = data.to,
                timers = data.timers,

                anim = this.anims[data.id],
                delay = anim.delay,
                start = anim.start,

                method = anim.method,
                Se = S(eltdata.e),
                value = {},
                channel,
                spec,
                update;

            if( !(method in S.Easing) )
                Error('Undefined animation method: ' + method);

            //effet simple
            if(data.type !== 4){

                to = { value: to };
                from = { value: from };
                channel = ['value'];
                spec = 0;
                update = data.type === 1 ?
                    function(sub){ Se.css(prop, value[sub] + data.unit); } :
                    function(sub){ Se.css(prop, value[sub]); };
            }
            //effet couleur
            else{

                to = S.Css.toRGBa(to);
                from = S.Css.toRGBa(from);
                channel = ['red', 'green', 'blue', 'alpha'];
                spec = from.alpha !== 1 || to.alpha !== 1 ? 2 : 1;

                update = spec === 2 ?
                    function(sub){ Se.css(prop, 'rgba(' + value.red + ',' + value.green + ',' + value.blue + ',' + value.alpha + ')'); } :
                    function(sub){ Se.css(prop, 'rgb(' + value.red + ',' + value.green + ',' + value.blue + ')'); };
            }

            Fl(channel, function(i, sub){

                value[sub] = from[sub];

                var diff = to[sub] - from[sub],
                    timer = setInterval(function(){

                        var now = S.Time.now(),
                            past = now - start;

                        //l'animation doit se terminer
                        if(past >= delay || !diff){

                            if(diff){

                                value[sub] = to[sub];

                                update(sub);
                            }

                            clearInterval(timer);

                            if(!spec || (value.red === to.red && value.green === to.green && value.blue === to.blue && value.alpha === to.alpha))
                                Fx.callback(elementId, prop, false);
                        }

                        else{

                            value[sub] = from[sub] + diff * S.Easing[method](past / delay, past, 0, 1, delay);

                            //les animations couleur ne fonctionnent pas avec les flottants
                            if(spec && sub !== 'alpha')
                                value[sub] = Math.round(value[sub]);

                            update(sub);
                        }

                    }, 0);

                timers.push(timer);
            });
        },

        callback: function(elementId, prop, stopped){

            var stock = this.stock,
                eltdata = stock[elementId];

            //dans le cas d'une animation couleur qui n'a pas besoin de se faire (exemple noir -> noir)
            //la condition de callback de active cree une erreur pour chacun des 3 derniers canaux car
            //la condition est satisfaite pour le premier canal et l'entree est donc effacee et n'existe
            //plus pour les 3 autres
            if(eltdata){

                var props = eltdata.prop,
                    data = props[prop];

                //meme probleme que plus haut
                if(data){

                    var anims = this.anims,
                        id = data.id,
                        animdata = anims[id],
                        iddata = eltdata[id];

                    iddata.stopped = iddata.stopped || stopped;

                    delete props[prop];

                    //animation finie sur cet element
                    if( !--iddata.length ){

                        if( !--animdata.length )
                            delete anims[id];

                        delete --eltdata.length ?
                            eltdata[id] :
                            stock[elementId];

                        if(!iddata.stopped && animdata.callback)
                            animdata.callback.call(eltdata.e);
                    }
                }
            }
        }
    },

    //declare ici a cause de son implication dans Handler
    Browser = {

        //utiliser nav.toLowerCase() et pas /.../i car name doit etre en minuscules
        //'' par defaut si konqueror ou autre car si browser === null //.test(browser) bug
        name: (function(){

            var bname = Rex.rbrowser.exec( navigator.userAgent.toLowerCase() );

            return bname ? bname[0] : '';
        })(),

        //undefined sur IE5 qui est toujours en quirks
        quirkMode: !(document.compatMode === 'CSS1Compat')
    },

    Handler = {

        elementId: -1,
        handlerId: -1,

        stock: {},

        active: function(elementId, type, handlerId, event){

            var eltdata = this.stock[elementId],
                data = eltdata[type][handlerId];

            //pour IE event est stocke dans une variable globale
            if(!event)
                event = S.Dom.parentWindow(eltdata.e).event;

            //on fait ressembler l'objet event a celui du w3c
            //ne pas reecrire si les prop sont deja dispo car leve exception
            if(!event.type)
                event.type = type;

            if(!event.target)
                event.target = event.srcElement;

            //2 if car si currentTarget existe ce n'est pas forcement qu'il est gere mais
            //plutot qu'on l'a deja calcule
            if(!event.currentTarget)
                event.needCurrentTarget = true;
            if(event.needCurrentTarget)
                event.currentTarget = eltdata.e;

            if(!event.CAPTURING_PHASE)
                event.CAPTURING_PHASE = 1;

            if(!event.AT_TARGET)
                event.AT_TARGET = 2;

            if(!event.BUBBLING_PHASE)
                event.BUBBLING_PHASE = 3;

            //2 if car si eventPhase existe ce n'est pas forcement qu'il est gere mais
            //plutot qu'on l'a deja calcule
            if(!event.eventPhase)
                event.needEventPhase = true;
            if(event.needEventPhase)
                event.eventPhase = event.currentTarget === event.target ? event.AT_TARGET :
                                    S(event.currentTarget).descendants().indexOf(event.target) !== -1 ? event.CAPTURING_PHASE :
                                    event.BUBBLING_PHASE;

            if(!('bubbles' in event))
                event.bubbles = !event.cancelBubble;

            if(!event.stopPropagation)
                event.stopPropagation = function(){ this.cancelBubble = true; };

            if(!event.preventDefault)
                event.preventDefault = function(){ this.returnValue = false; };


            var result = data.action.call(eltdata.e, event);

            if(result === false)
                event.preventDefault();

            else if(result === true)
                event.stopPropagation();
        }
    },

    Short = {

        '!': 'not',
        '&': 'and',
        '|': 'or',
        //alias officiel
        ',': 'or',
        '^': 'xor'
    },

    CSS3 = {

        /* '>' descendance directe(enfants)
           ' ' descendance indirecte(descendants)
           '+' adjacence directe
           '~' adjacence indirecte */

        //and filtre a rebours de descendants
        and: {

            '>': 'parent',
            ' ': 'ancestors',
            '+': 'previous',
            '~': 'olders'
        },

        descendants: {

            '>': 'children',
            ' ': 'descendants',
            '+': 'next',
            '~': 'youngers'
        }
    };

    //declare a la main car contient extend qui sert pour declarer tout le reste
    S.Object = {

        each: Fi,

        extend: function(base, set){

            this.each(set, function(i, j){

                //La clause try/catch permet de ne pas tenir compte des proprietes read-only
                //qui generent des erreurs quand on tente de les reecrire, l'exemple le plus
                try{ base[i] = j; }
                catch(e){}
            });
            //si base n'est pas une reference
            return base;
        },

        clone: function(obj){

            return this.extend({}, obj);
        },

        //pour les browsers qui ne gerent pas ces nouvelles methodes
        isExtensible: window.Object.isExtensible || function(obj){

            //on cherche une propriete que n'a pas encore l'objet
            for(var i = S.Time.now();
                i in obj;
                i++);

            try{

                obj[i] = true;

                return delete obj[i];
            }
            catch(e){ return false; }
        },

        isSealed: window.Object.isSealed || function(obj){

            var sealed = false;

            if(!this.isExtensible(obj))
                Fi(obj, function(i, data){

                    //avec IE faire un delete sur une propriÃ©tÃ© sealed crÃ©e une erreur au lieu de renvoyer false
                    try{

                        sealed = !(delete obj[i]);

                        //gros probleme, l'objet Ã©tant sensÃ© Ãªtre inextensible comment pourrais-je
                        //lui remettre la propriÃ©tÃ© que je viens de supprimer?
                        if(!sealed) obj[i] = data;

                        return sealed;
                    }
                    catch(e){}
                });

            return sealed;
        },

        isFrozen: window.Object.isFrozen || function(obj){

            var frozen = false;

            if(this.isSealed(obj))
                Fi(obj, function(i, data){

                    //il faut une valeur differente a tout prix
                    for(var val = S.Time.now();
                        obj[i] === val;
                        val++);

                    try{

                        obj[i] = val;
                        //Safari ne renvoie pas d'erreur si on assigne une nouvelle valeur a une propriete gelee
                        //il n'en tient simplement pas compte
                        frozen = obj[i] === data;

                        if(!frozen) obj[i] = data;

                        return frozen;

                    }
                    catch(e){}
                });

            return frozen;
        }
    };

    S.Object.extend(S, {

        JSailor: function(expr){
        //on ne doit pas renvoyer d'objet car JSailor est un constructeur pas une fonction!!

            //permet S(null) ou S(undefined)
            var coll = [];

            if( S.Test.isString(expr) ){

                this.regexp = expr;

                var cache = Cache.jsailor;

                //si une version est disponible en cache
                if(expr in cache.selectors)
                    coll = cache.selectors[expr].$;

                else{

                    if(cache.empty){
                        
                        S(document).once('DOMSubtreeModified', function(){

                            cache.selectors = {};
                            cache.empty = true;
                        });

                        cache.empty = false;
                    }

                    cache.selectors[expr] = this;

                    coll = /*Support.querySelector ? S.Dom.collecToArray(document.querySelectorAll(expr)) : */
                           S(document).descendants(expr).$;
                }
            }

            else if( S.Test.isFunction(expr) )
                S(document).ready(expr);

            else if( S.Test.isArray(expr) )
                coll = expr;

            else if(expr)
                coll = expr.nodeType === 1 || expr.nodeType === 9 || expr.nodeType === 11 ?
                    [ expr ] :
                    //cas d'une collection html car IE n'a pas de toString customises comme les autres
                    //l'element select a egalement la propriete length qui correspond a son nombre
                    //d'options donc ne pas tester .length
                    //cas de la collection car aucun test probant
                    S.Dom.collecToArray(expr);

            this.$ = coll,
            this.length = coll.length;
        },

        Key: {

            //suppression
            BACKSPACE: 8,
            SPACE: 32,
            TAB: 9,
            ENTER: 13,
            SHIFT: 16,
            CTRL: 17,
            ALT: 18,
            CAPSLOCK: 20,
            ESC: 27,
            ARROW: {

                left: 37,
                right: 39,
                up: 38,
                down: 40
            },
            OSKEY: {

                left: 91,
                right: 93
            }
        },

        /*
         * linear and swing come from jQuery v1.7.2
         * others equations come from jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/ by George McGinley Smith
         */
        Easing: {

			//default est un mot clef reserve pb IE
            'default': 'linear',

            linear: function(s, t, b, c, d){

                return s;
            },

            swing: function(s, t, b, c, d){

                return (1 - Math.cos(s * Math.PI)) / 2;
            },

            expoIn: function(s, t, b, c, d){

                return t === 0 ? b :
                    c * Math.pow(2, 10 * (t / d - 1)) + b;
            },

            expoOut: function(s, t, b, c, d){

                return t === d ? b + c :
                    c * (1 - Math.pow(2, -10 * t / d)) + b;
            },

            expoInOut: function(s, t, b, c, d){

                return t === 0 ? b :
                       t === d ? b + c :
                       c / 2 * ((t /= d / 2) < 1 ? Math.pow(2, 10 * (t - 1)) : 2 - Math.pow(2, -10 * (t - 1))) + b;
            },

            circIn: function(s, t, b, c, d){

                t /= d;

                return -c * (Math.sqrt(1 - t * t) - 1) + b;
            },

            circOut: function(s, t, b, c, d){

                t = t / d - 1;

                return c * Math.sqrt(1 - t * t) + b;
            },

            circInOut: function(s, t, b, c, d){

                t /= d / 2;

                return c / 2 * (t < 1 ? -Math.sqrt(1 - t * t) - 1 : Math.sqrt(1 - (t -= 2) * t) + 1) + b;
            },

            elasticIn: function(s, t, b, c, d){

                var p = d * .3;

                return t === 0 ? b :
                    (t /= d) === 1 ? b + c :
                    -c * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - (c < 0 ? p / 4 : p / (2 * Math.PI) * Math.asin(1))) * 2 * Math.PI / p) + b;
            },

            elasticOut: function(s, t, b, c, d){

                var p = d * .3;

                return t === 0 ? b :
                    (t /= d) === 1 ? b + c :
                    c * Math.pow(2, -10 * t) * Math.sin((t * d - (c < 0 ? p / 4 : p / (2 * Math.PI) * Math.asin(1))) * 2 * Math.PI / p) + c + b;
            },

            elasticInOut: function(s, t, b, c, d){

                if(t === 0) return b;
                else if((t /= d / 2) === 2) return b + c;

                t--;

                var p = d * .3 * 1.5,
                    r = c < 0 ? p / 4 : p / (2 * Math.PI) * Math.asin(1),
                    tmp = c * Math.sin((t * d - r) * 2 * Math.PI / p) / 2;

                return t < 0 ?
                    -Math.pow(2, 10 * t) * tmp + b :
                    Math.pow(2, -10 * t) * tmp + c + b;
            },

            backIn: function(s, t, b, c, d){

                t /= d;

                return c * t * t * ((t - 1) * 1.70158 + t) + b;
            },

            backOut: function(s, t, b, c, d){

                t = t / d - 1;

                return c * (t * t * ((t + 1) * 1.70158 + t) + 1) + b;
            },

            backInOut: function(s, t, b, c, d){

                var r = 1.70158 * 1.525;

                return  c / 2 * ((t /= d / 2) < 1 ?
                    t * t * ((r + 1) * t - r) :
                    (t -= 2) * t * ((r + 1) * t + r) + 2) + b;
            },

            bounceIn: function(s, t, b, c, d){

                return c - this.bounceOut(s, d - t, 0, c, d) + b;
            },

            bounceOut: function(s, t, b, c, d){

                return c * ((t /= d) < 1 / 2.75 ? 7.5625 * t * t :
                    t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 :
                    t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 :
                    7.5625 * (t -= 2.625 / 2.75) * t + .984375) + b;
            },

            bounceInOut: function(s, t, b, c, d){

                return t < d / 2 ?
                    this.bounceIn(s, t * 2, 0, c, d) / 2 + b :
                    (this.bounceOut(s, t * 2 - d, 0, c, d) + c) / 2 + b;
            }
        },

        //extenseur HTML
        Enhancer: {

            //scroll anime sur les ancres vers la page courante
            anchor: {
                    
                on: false,
                //- on ne gere que les ancres internes explicites, gerer les ancres
                //internes avec chemin redondant est trop complique (vars, url rewriting...)
                //- on ne gere pas les ancres au chargement de page car c'est tres complique
                //pour pas grand chose, de plus cela impliquerait un smoothAnchor qui se declenche
                //dans les premiers DOMReady handlers ce qui fait un truc assez moche avec l'exemple
                //de Omega ou cela revient a scroller sur un element pas encore visible
                regexp: 'a[href^=#]',
                each: function(){
            
                    //on fait tous les calculs au moment du click pour ne pas utiliser des infos obsoletes        
                    S(this).click(function(){
                        
                        var body = S('body'),
                            hash = S(this).attr('href'),
                            anchorelt = S(hash.length > 1 ? hash : undefined);

                        body.tune({

                            //une ancre peut ne pas avoir d'element correspondant cas typique des liens ajax
                            'scroll-top': (anchorelt.length ? anchorelt : body).top()

                        }, 1000, 'bounce-out', function(){
                        
                            //attention return false tout seul bloque la mise du hash dans l'url
                            location.hash = hash;
                        });
                        
                        //bloque le scroll natif
                        return false;
                    });
                }
            },

            //blocage du copier/coller sur les champs textes de confirmation
            retype: {

                on: false,
                regexp: 'input[retype]',
                each: function(){

                    S(this).bind('paste', function(){

                        return false;
                    });
                }
            },

            email: {

                on: false,
                regexp: 'input[type=email]',
                each: function(){

                    //this.type === 'text' si non supporte

                    S(this).attr('placeholder', 'mail@host.com').blur(function(){

                        var value = S(this).value();

                        if(value)
                            S(this).css('background-color', Rex.remail.test(value) ? '#CDE79B' : '#FFBCBC');

                    }).focus(function(){

                        S(this).css('background-color', '');
                    });
                }
            },

            //<p hover="color:red;"></p>
            hover: {

                on: false,
                regexp: '[hover]',
                each: function(){

                    var Se = S(this),
                        style = S.String.stripSpaces(Se.attr('hover')).split(':'),
                        css = {};

                    css[style[0]] = style[1].substring(0, style[1].length - 1);

                    Se.hover(css);
                }
            },

            lazyLoad: {

                on: false,
                regexp: 'img[lazysrc]',
                each: function(){

                    S(this).lazyLoad('fade', 300);
                }
            },

            uniLoad: {

                on: false,
                regexp: 'img[unisrc]',
                each: function(){

                    S(this).uniLoad('fade', 300);
                }
            },

            toolTip: {

                on: false,
                regexp: '[tip]',
                each: function(){

                    S(this).toolTip();
                }
            },

            loremIpsum: {

                on: false,
                regexp: '[loremipsum]',
                each: function(){

                    S(this).loremIpsum();
                }
            },

            drag: {

                on: false,
                regexp: '[draggable]',
                each: function(){

                    S(this).drag();
                }
            },

            degrade: {

                on: false,
                regexp: '[degrade]',
                each: function(){

                    var Se = S(this),
                        colors = S.String.stripSpaces( Se.attr('degrade') ).split(',');

                    Se.degrade(colors[0], colors[1]);
                }
            }
        },

        Parser: {

            js: function(str){

                //attacher eval a window sinon contexte d'execution errone
                return window.eval(str);
            },

            json: function(str){

                return window.JSON ? window.JSON.parse(str) : this.js('(' + str + ')');
            },

            xml: function(str){

                if(window.DOMParser)
                    return new window.DOMParser().parseFromString(str, 'text/xml');

                else{

                    var doc = new window.ActiveXObject('Microsoft.XMLDOM');

                    doc.loadXML(str);

                    return doc;
                }
            }
        },

        Time: {

            now: function(){

                return new Date().getTime();
            },

            chrono: function(fn){

                var init = this.now();

                fn();

                return this.now() - init;
            },

            epoch: function(){

                return new Date(0).toGMTString();
            }
        },

        Browser: Browser,

        //les filtres doivent etre applicables aux elements, au document et aux fragments
        Filter: {

            button: function(e){

                return e.type === 'button' || e.nodeName.toLowerCase() === 'button';
            },

            text: function(e){

                return e.type === 'text' || e.nodeName.toLowerCase() === 'textarea';
            },

            input: function(e){

                return Rex.rinput.test( e.nodeName );
            },

            checked: function(e){

                return e.checked;
            },

            tuned: function(e){

                return e.JSailorElementId in Fx.stock;
            },

            //empty et parent tiennent compte des noeuds textes
            empty: function(e){

                return !this.parent(e);
            },

            parent: function(e){

                return e.hasChildNodes();
            },

            contains: (function(){

                var prop = Support.textContent ? 'textContent' : 'innerText';

                return function(e, text){

                    //la prop n'est pas defini sur document
                    if(e.nodeType === 9)
                        e = e.documentElement;

                    //return new RegExp(text, 'i').test(e[prop]);
                    return e[prop].indexOf(text) !== -1;
                };
            })(),

            //les selecteurs CSS3 ne comptent pas les noeuds textes
            firstChild: Support.elementFocus ? function(e){

                return !e.previousElementSibling;

            } : function(e){

                while(e = e.previousSibling)
                    if(e.nodeType === 1)
                        return false;

                return true;
            },

            lastChild: Support.elementFocus ? function(e){

                return !e.nextElementSibling;

            } : function(e){

                while(e = e.nextSibling)
                    if(e.nodeType === 1)
                        return false;

                return true;
            },

            onlyChild: function(e){

                return this.firstChild(e) && this.lastChild(e);
            },

            //pour les predicats nommes en ..Type, on peut utiliser le code JSailor car il s'agit uniquement
            //de noeuds elements, on ne peut pas tester uniquement le tag car CSS3 differencie un input text
            //d'un input checkbox
            firstOfType: (function(){

                var prop = 'previous' + (Support.elementFocus ? 'Element' : '') + 'Sibling';

                return function(e1){

                    var e2 = e1;

                    while(e2 = e2[prop])
                        if( S.Dom.areSameType(e1, e2) )
                            return false;

                    return true;
                };
            })(),

            lastOfType: (function(){

                var prop = 'next' + (Support.elementFocus ? 'Element' : '') + 'Sibling';

                return function(e1){

                    var e2 = e1;

                    while(e2 = e2[prop])
                        if( S.Dom.areSameType(e1, e2) )
                            return false;

                    return true;
                };
            })(),

            onlyOfType: function(e){

                return this.firstOfType(e) && this.lastOfType(e);
            },

            not: function(e, expr){

                return !!S(e).not(expr).length;
            },

            inViewport: function(e){

                //un document est forcement dans le viewport
                if(e.nodeType === 9)
                    return true;
                //un fragment est forcement invisible
                else if(e.nodeType === 11)
                    return false;

                var Se = S(e),
                    top = Se.top(),
                    left = Se.left(),
                    scrollParent = Se.ancestors(':css(overflow=scroll)').$[0] || e.ownerDocument,
                    Sparent = S(scrollParent),
                    scrollTop = Sparent.scrollTop(),
                    scrollLeft = Sparent.scrollLeft();

                return arguments.callee(scrollParent) &&
                        top + Se.height() > scrollTop && top < scrollTop + Sparent.height() &&
                        left + Se.width() > scrollLeft && left < scrollLeft + Sparent.width();
            },

            outViewport: function(e){

                return !this.inViewport(e);
            },

            css: function(e, styles){

                if(e.nodeType === 9 || e.nodeType === 11)
                    return false;

                var Se = S(e),
                    res = true;

                Fl(styles.split(','), function(){

                    var iegal = this.indexOf('=');

                    return (res = res && Se.css(this.substring(0, iegal)) === this.substring(iegal + 1));
                });

                return res;
            }
        },

        About: {

            version: '1.1.7',

            author: 'Yvain Giffoni',

            url: 'http://omega.webou.net/jsailor/',

            copyright: 2013
        },

        Math: {

            each: function(nb, fn){

                var sign = this.sign(nb);

                nb = Math.abs(nb) + '';

                //re parseInt sur nb pour les flottants
                //les puissances apres le . sont negatives
                //le -1 initial est fait via --i
                var n, i = (parseInt(nb)+'').length;

                S.String.each(nb, function(){

                    n = sign * parseInt(this);

                    //si on tombe pas sur le '.'
                    if( !isNaN(n) )
                        fn.call(n, --i, n);
                });
            },

            between: function(n, a, b){

                return n >= a && n < b;
            },

            euclid: function(num, den){ return parseInt(num / den); },

            sign: function(nb){ return nb < 0 ? -1 : 1; },

            root: function(nb, n){ return Math.pow(nb, 1/n); },

            round: function(nb, dec){

                var pow = Math.pow(10, -dec);

                return Math.round(nb * pow) / pow;
            },

            //nombre indefini d'arguments
            arimean: function(){

                var somme = 0;

                Fl(arguments, function(){ somme += this; });

                return somme / arguments.length;
            },

            //nombre indefini d'arguments
            geomean: function(){

                var product = 1;

                Fl(arguments, function(){ product *= this; });

                return this.root(product, arguments.length);
            }
        },

        Test: {

            toString: function(val){

                return Object.prototype.toString.call(val);
            },

            isJSailor: function(val){

                //sans la 1ere condition isJSailor('[object JSailor]') renverrait true
                return this.isObject(val) && val.toString() === '[object JSailor]';
            },

            isWindow: function(val){

                return 'isNaN' in val;
            },

            isset: function(val){

                return val !== null && val !== undefined;
            },

            isEncapsulated: function(pos, str){

                if(S.Test.isString(pos))
                    pos = str.indexOf(pos);

                var brackets = 0;

                S.String.each(str, function(i, char){

                    //permet de gerer le cas ou pos = '(' || ')'
                    if(i === pos) return false;

                    else if(char === '(') brackets++;

                    //le 2e test permet de gerer le cas 'Amie)(s)' ou la fermante et avant l'ouvrante
                    else if(char === ')' && brackets) brackets--;
                });

                return !(brackets === 0);
            }
        },

        String: {

            each: function(str, fn){

                var length = str.length, char;

                for(var i = 0; i < length; i++){

                    char = str.charAt(i);

                    if(fn.call(char, i, char) === false)
                        break;
                }
            },

            inList: function(single, multi, char){

                return new RegExp(char + single + char).test(char + multi + char);
            },

            //John Resig
            //http://code.jquery.com/jquery-1.3.2.js
            camelCase: function(str, sep){

                return str.replace(new RegExp(sep + '([a-z])', 'gi'), function(){ return arguments[1].toUpperCase(); });
            },

            parseBool: function(str){

                return str === 'true';
            },

            indexOfEndingBracket: function(pos, str){

                var brackets = 1,
                    index = -1,
                    char,
                    length = str.length;

                for(var i = pos + 1; i < length; i++){

                    char =  str.charAt(i);

                    if(char === '(') brackets++;

                    else if(char === ')'){

                        brackets--;

                        if(!brackets){

                            index = i;

                            break;
                        }
                    }
                }

                return index;
            }
        },

        Array: {

            each: Fl,

            extend: function(base, set){

                this.each(set, function(i, j){

                    base[i] = j;
                });
                //si base n'est pas une reference
                return base;
            },

            clone: function(ar){

                return ar.slice(0);
            },

            map: function(fn, arr){

                var res = [];

                this.each(arr, function(i, data){

                    res.push( fn.call(data, i, data) );
                });

                return res;
            },

            unsetValue: function(val, arr){

                var res = [];

                this.each(arr, function(){

                    if(this !== val)
                        res.push(this);
                });

                return res;
            },

            unsetValues: function(vals, arr){

                var res = [];

                this.each(arr, function(){

                    if(vals.indexOf(this) === -1)
                        res.push(this);
                });

                return res;
            }
        },

        Dom: {

            parentWindow: (function(){

                var prop = Support.defaultView ? 'defaultView' : 'parentWindow';

                return function(e){

                    if(e.nodeType !== 9)
                        e = e.ownerDocument;

                    return e[prop];
                };
            })(),

            isReady: function(){

                //ne pas utiliser interactive car sous IE readyState === 'interactive' des le debut
                return document.readyState === 'complete';
            },

            areSameType: function(e1, e2){

                return e1.nodeName === e2.nodeName && (e1.nodeName !== 'input' || e1.type === e2.type);
            },

            collecToArray: function(col){

                var res = [];

                Fl(col, function(){ res.push(this); });

                return res;
            },

            stringToFragment: function(str){

                var temp = document.createElement('div'),
                    frag = document.createDocumentFragment();

                //on ne peut pas directement affecter innerHTML a un fragment
                temp.innerHTML = str;

                for(var e = temp.firstChild; e; e = e.nextSibling)
                    frag.appendChild( e.cloneNode(true) );

                //obligation de cloner les enfants de temp avant de les inserer dans frag
                //car sinon temp.childNodes est modifiee et les items se barrent en couille
                //Fl(temp.childNodes, function(){ frag.appendChild( this.cloneNode(true) ); });

                return frag;
            },

            arrayToFragment: function(arr){

                var frag = document.createDocumentFragment();

                Fl(arr, function(){ frag.appendChild(this); });

                return frag;
            },

            //sauf est un parametre interne pour siblingsOf(elt)
            //on ne peut pas tester l'existence de firstElementChild
            //en dehors de la fonction car les fragments ne le gerent
            //pas meme si les elements le gerent
            childrenOf: function(elt, sauf){

                var children = [];

                if('firstElementChild' in elt){

                    for(var e = elt.firstElementChild; e; e = e.nextElementSibling)
                        if(!sauf || e !== sauf)
                            children.push(e);
                }
                else{

                    for(var e = elt.firstChild; e; e = e.nextSibling)
                        if( e.nodeType === 1 && (!sauf || e !== sauf) )
                            children.push(e);
                }

                return children;

            },

            siblingsOf: function(elt, pos){

                //pos == 0 est valable en tant que position
                if( pos !== undefined ){

                    var sibling, multi, appr, res;

                    if( S.Test.isString(pos) ){

                        sibling = pos === 'younger' ? 'next' : 'previous';
                        multi = true;
                        res = [];
                    }
                    else{

                        sibling = pos > 0 ? 'next' : 'previous';
                        multi = false;
                        appr = Math.abs(pos);
                    }

                    sibling += 'Sibling';

                    while(elt && (multi || !res)){

                        elt = multi || appr ? elt[sibling] : elt;

                        if( elt && elt.nodeType === 1 )

                            if(multi)
                                res.push(elt);
                            else if(appr)
                                appr--;
                            else
                                res = elt;
                    }

                    return res;
                }
                //tous les siblings sauf l'element lui meme
                else
                    return this.childrenOf(elt.parentNode, elt);
            },

            ancestorsOf: function(e){

                var parent = e.parentNode;

                return parent ? [ parent ].concat( arguments.callee(parent) ) : [];
            },

            hasClass: function(e, classe){

                return S.String.inList(classe, e.className, ' ');
            }
        },

        Event: {

            bind: function(elt, type, fn){

                if( !('JSailorElementId' in elt) )
                    elt.JSailorElementId = ++Handler.elementId;

                if( !('JSailorHandlerId' in fn) )
                    fn.JSailorHandlerId = ++Handler.handlerId;

                var stock = Handler.stock,
                    handler = function(event){

                        Handler.active(elt.JSailorElementId, type, fn.JSailorHandlerId, event);
                    };

                if(!stock[elt.JSailorElementId])
                    stock[elt.JSailorElementId] = {

                        e: elt,
                        //nb types differents
                        length: 0
                    };

                stock = stock[elt.JSailorElementId];

                if(!stock[type]){

                    stock.length++;
                    stock[type] = { length: 0 };
                }

                stock = stock[type];

                if(!stock[fn.JSailorHandlerId])
                    stock.length++;

                stock[fn.JSailorHandlerId] = {

                    action: fn,
                    handler: handler
                };

                document.addEventListener ?
                    elt.addEventListener(type, handler, false) :
                    elt.attachEvent('on' + type, handler);
            },

            //detache les listeners n'utilisant pas la capture
            unbind: function(elt, type, fn){

                var handler = fn;

                if('JSailorElementId' in elt && 'JSailorHandlerId' in fn){

                    var stock = Handler.stock,
                        data = stock;

                    if((data = data[elt.JSailorElementId]) && (data = data[type]) && (data = data[fn.JSailorHandlerId])){

                        handler = data.handler;

                        delete --stock[elt.JSailorElementId][type].length ?
                                   stock[elt.JSailorElementId][type][fn.JSailorHandlerId] :

                                   --stock[elt.JSailorElementId].length ?
                                       stock[elt.JSailorElementId][type] :

                                       stock[elt.JSailorElementId];
                    }
                }

                document.removeEventListener ?
                    elt.removeEventListener(type, handler, false) :
                    elt.detachEvent('on' + type, handler);
            },

            fire: function(elt, type, data){

                data = S.Object.extend({

                    bubbles: true,
                    cancelable: true

                }, data);

                data.cancelBubble = !data.bubbles;

                var suppr = function(){

                    delete data.bubbles;
                    delete data.cancelable;
                };

                if(document.createEvent){

                    var event = document.createEvent('Events');
                    event.initEvent(type, data.bubbles, data.cancelable);

                    suppr();

                    elt.dispatchEvent( S.Object.extend(event, data) );
                }

                else{

                    suppr();

                    elt.fireEvent('on' + type, S.Object.extend(document.createEventObject(), data) );
                }
            }
        },

        // Peut etre etendu de l'exterieur par n'importe qui
        // Source: http://www.w3.org/TR/css3-color/
        Color: {

            aliceblue: [240, 248, 255],
            antiquewhite: [250, 235, 215],
            aqua: [0, 255, 255],
            aquamarine: [127, 255, 212],
            azure: [240, 255, 255],
            beige: [245, 245, 220],
            bisque: [255, 228, 196],
            black: [0, 0, 0],
            blanchedalmond: [255, 235, 205],
            blue: [0, 0, 255],
            blueviolet: [138, 43, 226],
            brown: [165, 42, 42],
            burlywood: [222, 184, 135],
            cadetblue: [95, 158, 160],
            chartreuse: [127, 255, 0],
            chocolate: [210, 105, 30],
            coral: [255, 127, 80],
            cornflowerblue: [100, 149, 237],
            cornsilk: [255, 248, 220],
            crimson: [220, 20, 60],
            cyan: [0, 255, 255],
            darkblue: [0, 0, 139],
            darkcyan: [0, 139, 139],
            darkgoldenrod: [184, 134, 11],
            darkgray: [169, 169, 169],
            darkgreen: [0, 100, 0],
            darkgrey: [169, 169, 169],
            darkkhaki: [189, 183, 107],
            darkmagenta: [139, 0, 139],
            darkolivegreen: [85, 107, 47],
            darkorange: [255, 140, 0],
            darkorchid: [153, 50, 204],
            darkred: [139, 0, 0],
            darksalmon: [233, 150, 122],
            darkseagreen: [143, 188, 143],
            darkslateblue: [72, 61, 139],
            darkslategray: [47, 79, 79],
            darkslategrey: [47, 79, 79],
            darkturquoise: [0, 206, 209],
            darkviolet: [148, 0, 211],
            deeppink: [255, 20, 147],
            deepskyblue: [0, 191, 255],
            dimgray: [105, 105, 105],
            dimgrey: [105, 105, 105],
            dodgerblue: [30, 144, 255],
            firebrick: [178, 34, 34],
            floralwhite: [255, 250, 240],
            forestgreen: [34, 139, 34],
            fuchsia: [255, 0, 255],
            gainsboro: [220, 220, 220],
            ghostwhite: [248, 248, 255],
            gold: [255, 215, 0],
            goldenrod: [218, 165, 32],
            gray: [128, 128, 128],
            green: [0, 255, 0],
            greenyellow: [173, 255, 47],
            grey: [128, 128, 128],
            honeydew: [240, 255, 240],
            hotpink: [255, 105, 180],
            indianred: [205, 92, 92],
            indigo: [75, 0, 130],
            ivory: [255, 255, 240],
            khaki: [240, 230, 140],
            lavender: [230, 230, 250],
            lavenderblush: [255, 240, 245],
            lawngreen: [124, 252, 0],
            lemonchiffon: [255, 250, 205],
            lightblue: [173, 216, 230],
            lightcoral: [240, 128, 128],
            lightcyan: [224, 255, 255],
            lightgoldenrodyellow: [250, 250, 210],
            lightgray: [211, 211, 211],
            lightgreen: [144, 238, 144],
            lightgrey: [211, 211, 211],
            lightpink: [255, 182, 193],
            lightsalmon: [255, 160, 122],
            lightseagreen: [32, 178, 170],
            lightskyblue: [135, 206, 250],
            lightslategray: [119, 136, 153],
            lightslategrey: [119, 136, 153],
            lightsteelblue: [176, 196, 222],
            lightyellow: [255, 255, 224],
            lime: [0, 255, 0],
            limegreen: [50, 205, 50],
            linen: [250, 240, 230],
            magenta: [255, 0, 255],
            maroon: [128, 0, 0],
            mediumaquamarine: [102, 205, 170],
            mediumblue: [0, 0, 205],
            mediumorchid: [186, 85, 211],
            mediumpurple: [147, 112, 219],
            mediumseagreen: [60, 179, 113],
            mediumslateblue: [123, 104, 238],
            mediumspringgreen: [0, 250, 154],
            mediumturquoise: [72, 209, 204],
            mediumvioletred: [199, 21, 133],
            midnightblue: [25, 25, 112],
            mintcream: [245, 255, 250],
            mistyrose: [255, 228, 225],
            moccasin: [255, 228, 181],
            navajowhite: [255, 222, 173],
            navy: [0, 0, 128],
            oldlace: [253, 245, 230],
            olive: [128, 128, 0],
            olivedrab: [107, 142, 35],
            orange: [255, 165, 0],
            orangered: [255, 69, 0],
            orchid: [218, 112, 214],
            palegoldenrod: [238, 232, 170],
            palegreen: [152, 251, 152],
            paleturquoise: [175, 238, 238],
            palevioletred: [219, 112, 147],
            papayawhip: [255, 239, 213],
            peachpuff: [255, 218, 185],
            peru: [205, 133, 63],
            pink: [255, 192, 203],
            plum: [221, 160, 221],
            powderblue: [176, 224, 230],
            purple: [128, 0, 128],
            red: [255, 0, 0],
            rosybrown: [188, 143, 143],
            royalblue: [65, 105, 225],
            saddlebrown: [139, 69, 19],
            salmon: [250, 128, 114],
            sandybrown: [244, 164, 96],
            seagreen: [46, 139, 87],
            seashell: [255, 245, 238],
            sienna: [160, 82, 45],
            silver: [192, 192, 192],
            skyblue: [135, 206, 235],
            slateblue: [106, 90, 205],
            slategray: [112, 128, 144],
            slategrey: [112, 128, 144],
            snow: [255, 250, 250],
            springgreen: [0, 255, 127],
            steelblue: [70, 130, 180],
            tan: [210, 180, 140],
            teal: [0, 128, 128],
            thistle: [216, 191, 216],
            tomato: [255, 99, 71],
            turquoise: [64, 224, 208],
            violet: [238, 130, 238],
            wheat: [245, 222, 179],
            white: [255, 255, 255],
            whitesmoke: [245, 245, 245],
            yellow: [255, 255, 0],
            yellowgreen: [154, 205, 50]
        },

        Css: {

            //on peut utiliser 1ex = 0.5em comme IE et Opera car il est impossible de calculer
            //la veritable hauteur d'x de plus la difference n'est pas vraiment choquante et
            //cela permet tout de meme de gerer assez correctement les ex pour les unites relatives
            //et les animations .tune()

            /*

            px - int(pixel)
            pt - int(point)
            pc - int(pica)
            pct - float(pourcent)
            em - float(em)
            ex - float(hauteur d'x)
            cm - float(centimetre)
            mm - float(millimetre)
            in - float(inch/pouce)

            1ex = 0.5em
            1in = 2.54cm
            1cm = 10mm
            1in = 72pt
            1pc = 12pt = 16px
            1in = 6pc

            */

            getStyle: Support.computedStyle ?

                //getComputedStyle(computed)
                function(elt, prop){

                    return S.Dom.parentWindow(elt).getComputedStyle(elt, null)[ Fx.cssToJsProp(prop) ];
                } :

                //currentStyle(cascaded), utilisation de la méthode runtimeStyle par Dean Edwards
                //http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291
                function(elt, prop){

                    var prop = Fx.cssToJsProp(prop);

                    if( prop in elt.currentStyle ){

                        var value = elt.currentStyle[prop];

                        //shortcut si conversion inutile
                        if( Rex.rpixel.test(value+'') )
                            return parseInt(value) + 'px';

                        var style = elt.style.left,
                            runtimeStyle = elt.runtimeStyle.left;

                        elt.runtimeStyle.left = elt.currentStyle.left;

                        //si valeur css non numerique(nombre ou string+unite)conversion impossible
                        try{

                            elt.style.left = value || 0;
                            value = elt.style.pixelLeft + 'px';
                        }
                        catch(ex){}

                        elt.style.left = style;
                        elt.runtimeStyle.left = runtimeStyle;

                        return value;
                    }
                },

            pxTopt: function(size){ return Math.round( size * 0.75 ); },
            pxTopc: function(size){ return Math.round( size / 16 ); },
            pxTopct: function(size, elt, prop){ return this.pxToem(size, elt, prop) * 100; },
            pxToem: function(size, elt, prop){

                var parentsize = this.getStyle(elt.parentNode, prop);
                return size / parseInt( parentsize.substring(0, parentsize.length - 2) );
            },
            pxToex: function(size, elt, prop){ return this.pxToem(size, elt, prop) * 2; },
            pxTocm: function(size){ return this.pxToin(size) * 2.54; },
            pxTomm: function(size){ return this.pxTocm(size) * 10; },
            pxToin: function(size){ return size / 96; },

            ptTopx: function(size){ return Math.round( size * 16 / 12 ); },
            pcTopx: function(size){ return size * 16; },
            pctTopx: function(size, elt, prop){ return this.emTopx( size/100, elt, prop ); },
            emTopx: function(size, elt, prop){

                var parentsize = this.getStyle(elt.parentNode, prop);
                return size * parseInt( parentsize.substring(0, parentsize.length - 2) );
            },
            exTopx: function(size, elt, prop){ return this.emTopx( size/2, elt, prop ); },
            cmTopx: function(size){ return this.inTopx( size/2.54 ); },
            mmTopx: function(size){ return this.cmTopx( size/10 ); },
            inTopx: function(size){ return Math.round(size * 96); },

            convertSize: function(size, unitstart, unitend, elt, prop){

                if(unitstart === '%') unitstart = 'pct';
                if(unitend === '%') unitend = 'pct';

                return unitstart === unitend ? size :
                       unitstart === 'px' ? this['pxTo' + unitend](size, elt, prop) :
                       unitend === 'px' ? this[unitstart + 'Topx'](size, elt, prop) :
                       this['pxTo' + unitend](this[unitstart + 'Topx'](size, elt, prop), elt, prop);
            },

            toRGBa: function(str){

                str = S.String.stripSpaces(str);

                var splite, rgba,

                //HSL and HSV conversion algoritms from
                //http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript

                //hsl(deg, %, %) deg -> \u00b0
                hsl = function(h, s, l){

                    h /= 360, s /= 100, l /= 100;

                    var red, green, blue;

                    //achromatique
                    if(s === 0)

                        red = green = blue = l;

                    else{

                        var hue2rgb = function(p, q, t){

                            t < 0 &&
                                t++;

                            t > 1 &&
                                t--;

                            if(t < 1/6) return p + (q - p) * 6 * t;

                            if(t < 1/2) return q;

                            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;

                            return p;
                        },

                        q = l < 0.5 ? l * (1 + s) : l + s - l * s,
                        p = 2 * l - q;

                        red = hue2rgb(p, q, h+1/3),
                        green = hue2rgb(p, q, h),
                        blue = hue2rgb(p, q, h-1/3);
                    }

                    return S.Array.map([red, green, blue], function(){ return Math.round(this * 255); });
                },

                //hsv(deg, %, %)
                hsv = function(h, s, v){

                    h /= 360, s /= 100, l /= 100;

                    var i = Math.floor(h * 6),
                        f = h * 6 - i,
                        p = v * (1 - s),
                        q = v * (1 - f * s),
                        t = v * (1 - (1 - f) * s),
                        mod = i % 6;

                    return S.Array.map(mod === 0 ? [v, t, p] :
                                       mod === 1 ? [q, v, p] :
                                       mod === 2 ? [p, v, t] :
                                       mod === 3 ? [p, q, v] :
                                       mod === 4 ? [t, p, v] :
                                       [v, p, q], function(){ return Math.round(this * 255); });
                },

                //CMYK conversion algorithm from
                //http://www.webtoolkit.info/javascript-color-conversion.html

                //cmyk(%, %, %, %)
                cmyk = function(c, m, y, k){

                    c /= 100, m /= 100, y /= 100, k /= 100;

                    return S.Array.map([c, m, y], function(){

                        return Math.round( (1 - Math.min(1, this*(1-k)+k)) * 255 );
                    });
                };

                //rgb(num, num, num) ou rgba(num, num, num, a)
                (splite = /^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3}),?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = [parseInt(splite[1]), parseInt(splite[2]), parseInt(splite[3]), splite[4] ? parseFloat(splite[4]) : 1]) :

                //rgb(%, %, %) ou rgba(%, %, %, a) ! les pct sont des float
                (splite = /^rgba?\((\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = [Math.round(parseFloat(splite[1]) * 2.55), Math.round(parseFloat(splite[2]) * 2.55), Math.round(parseFloat(splite[3]) * 2.55), splite[4] ? parseFloat(splite[4]) : 1]) :

                //cmyk(num, num, num, num) ou cmyka(num, num, num, num, a)
                (splite = /^cmyka?\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3}),?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = cmyk(parseInt(splite[1])/2.55, parseInt(splite[2])/2.55, parseInt(splite[3])/2.55, parseInt(splite[4])/2.55),
                    rgba[3] = splite[5] ? parseFloat(splite[5]) : 1) :

                //cmyk(%, %, %, %) ou cmyka(%, %, %, %, a) ! les pct sont des float
                (splite = /^cmyka?\((\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = cmyk(parseFloat(splite[1]), parseFloat(splite[2]), parseFloat(splite[3]), parseFloat(splite[4])),
                    rgba[3] = splite[5] ? parseFloat(splite[5]) : 1) :

                //hsl(deg, %, %) ou hsla(deg, %, %, a)
                (splite = /^hsla?\((\d{1,3})\u00b0,(\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = hsl(parseInt(splite[1]), parseFloat(splite[2]), parseFloat(splite[3])),
                    rgba[3] = splite[4] ? parseFloat(splite[4]) : 1) :

                //hsv(deg, %, %) ou hsva(deg, %, %, a)
                (splite = /^hsva?\((\d{1,3})\u00b0,(\d{1,3}\.?\d*)%,(\d{1,3}\.?\d*)%,?(\d\.?\d{0,2})?\)$/.exec(str)) ?
                    (rgba = hsv(parseInt(splite[1]), parseFloat(splite[2]), parseFloat(splite[3])),
                    rgba[3] = splite[4] ? parseFloat(splite[4]) : 1) :

                //#FFA500
                (splite = /^#(\w{2})(\w{2})(\w{2})$/.exec(str)) ?
                    (rgba = [parseInt(splite[1], 16), parseInt(splite[2], 16), parseInt(splite[3], 16), 1]) :

                //#FFF
                (splite = /^#(\w)(\w)(\w)$/.exec(str)) ?
                    (rgba = [parseInt(splite[1] + splite[1], 16), parseInt(splite[2] + splite[2], 16), parseInt(splite[3] + splite[3], 16), 1]) :

                //nom de couleur
                (rgba = S.Color[str] || Error('Undefined color: ' + str),
                rgba[3] = 1);

                return {

                    red: rgba[0],
                    green: rgba[1],
                    blue: rgba[2],
                    alpha: rgba[3]
                };
            }
        },

        Cookie: {

            set: function(name, value, opt){

                opt = opt || {};

                var cook = name + '=' + escape(value);

                if('expires' in opt)
                    cook += ';expires=' + new Date(opt.expires).toGMTString();

                if(opt.path)
                    cook += ';path=' + opt.path;

                if(opt.secure)
                    cook += ';secure=' + opt.secure;

                if(opt.domain)
                    cook += ';domain=' + opt.domain;

                document.cookie = cook;
            },

            get: function(name){

                var cook = document.cookie,
                    start = cook.indexOf(' ' + name + '=');

                if(start === -1)
                    start = cook.indexOf(name + '=');

                if(start === -1) cook = null;

                else{

                    start = cook.indexOf('=', start) + 1;

                    var end = cook.indexOf(';', start);

                    if(end === -1)
                        end = cook.length;

                    cook = unescape( cook.substring(start, end) );
                }

                return cook;
            },

            erase: function(name){

                //les 2 cas si dessous sont les seuls que l'on peut traiter

                //efface le cookie dans le cas ou path est le meme que l'url de erase()
                this.set(name, null, { expires: -1 });
                //efface le cookie dans le cas ou ce dernier est visible depuis la racine
                this.set(name, null, { expires: -1, path: '/' });
            }
        },

        //l'enveloppe du Xhr() qui ne peut etre etendu directement a cause du ActiveXObject inextensible
        Ajax: (function(){

            var fusionParam = function(setting, setup, callback){

                if(!setup)
                    setup = {};

                else if( S.Test.isFunction(setup) )
                    setup = { success: setup };

                else if(callback)
                    setup.success = callback;

                S.Ajax.request( S.Object.extend(setting, setup) );
            };
            
            var uurl = function(url){
                    
                var nocache = 0;
                
                while(new RegExp('(\\?|&)[' + nocache + ']=').test(url))
                    nocache++; 

                return url += ( /\?/.test(url) ? '&' : '?') + '[' + nocache + ']=' + S.Time.now();
            };

            return {

                settings: {

                    //taille max du nested cache (default to 1Mio)
                    cacheSize: 1048576,
                    //type mime des donnees a cacher
                    cachedMimeType: '(text|application)/(plain|html|css|javascript|json|xml)'
                },

                //ActiveXObject est en tete car IE connais aussi XMLHttpRequest
                //cependant dans le cas ou la requete est locale(location.protocol === 'file:')
                //le XMLHttpRequest de Microsoft interdit la requete donc il faut
                //utiliser le ActiveX, ce dernier n'est pas extensible aussi il faut rajouter
                //une enveloppe car sinon on ne peut pas definir de nouvelles methodes!
                xhr: window.ActiveXObject ? function(){

                    try{ return new window.ActiveXObject('Microsoft.XMLHTTP'); }
                    catch(e){ return new window.ActiveXObject('Msxml2.XMLHTTP'); }

                } : window.XMLHttpRequest ? function(){

                    return new window.XMLHttpRequest();

                } : function(){

                    Error('Your browser doesn\'t support XMLHttpRequest');
                },

                request: function(params){

                    params = S.Object.extend({

                        //protocol://user:password@domain:port/...
                        url: null,
                        //GET, POST, HEAD, PUT, DELETE etc..
                        method: null,
                        //la valeur null peut generer des bugs sous Opera pour user et password
                        user: undefined,
                        password: undefined,
                        response: 'text',
                        async: true,
                        charset: 'UTF-8',
                        content: 'application/x-www-form-urlencoded',
                        //autorise l'utilisation du cache
                        //'never': jamais + ne stocke pas dans le cache
                        //'valid': si ressource inchangee
                        //'isset': des qu'un cache existe pour cette ressource
                        //'only': uniquement (si pas dans le cache alors rien)
                        cache: 'valid',
                        //passe automatiquement le cache en never pour les ressources php, jsp...
                        dynamic: true,
                        //requestHeaders supplementaires
                        headers: {},
                        data: null,
                        jscontext: null,
                        0: null,
                        1: null,
                        2: null,
                        3: null,
                        4: null,
                        //readyState maison lorsque le js a ete execute
                        5: null,
                        //identique a 4 mais si presente, reecrit celle ci
                        complete: null,
                        //identique a 5 mais si presente, reecrit celle ci
                        evaluated: null,
                        success: null,
                        fail: null

                    }, params);

                    /**********************
                     MISE EN FORME DES LOGS
                     **********************/
                    var logextract = Rex.rurlog.exec(params.url);

                    if(logextract){

                        //extraction des logs de l'url, ne pas reecrire les logs eventuellement existant
                        //les logs de params prevalent sur ceux de l'url
                        if(!params.user)
                            params.user = logextract[2];

                        if(!params.password)
                            params.password = logextract[3];

                        //effacement des logs de l'url
                        params.url = params.url.replace(Rex.rurlog, '$1://');
                    }

                    /***************************
                     MISE EN FORME DES CALLBACKS
                     ***************************/
                    if(params.complete)
                        params[4] = params.complete;
                    if(params.evaluated)
                        params[5] = params.evaluated;

                    //utilise ailleurs pour les extension dynamiques
                    var urlext = params.url.substring(params.url.lastIndexOf('.') + 1).toLowerCase(),
                        localquery = Rex.rlocal.test(location.protocol);

                    //si mode auto alors on teste l'extension sinon teste le params response et text par defaut
                    if(params.response === 'auto')
                        params.response = urlext;

                    if(params.dynamic && Rex.rdynext.test(urlext))
                        params.cache = 'never';

                    //par cette modification, on s'assure qu'il y a systematiquement
                    //une fonction de complete meme si elle ne fait rien, de cette maniere
                    //.get('.js', {response: 'js'}, noop) n'a pas besoin de noop() pour s'effectuer correctement
                    var buffer4 = params[4],
                        bufferSuccess = params.success;

                    params.success = function(res){

                        //console.log(params.url + ' : ' + this.getResponseHeader('Content-Type') + ' => ' + new RegExp(params.cachedMimeType).test(this.getResponseHeader('Content-Type')));

                        var response = params.response === 'js' ? S.Parser.js(res) :
                                       params.response === 'json' ? S.Parser.json(res) :
                                       //responseText est en default au cas ou l'extension serait inconnue
                                       Rex.rmarkupext.test(params.response) ? this.responseXML :
                                       res;

                        if(bufferSuccess)
                            bufferSuccess.call(this, response);

                        if(params.jscontext){

                            var scripts = S(params.jscontext).descendants('script'),
                                nbdone = 0,
                                jstate = function(){

                                    if(++nbdone === scripts.length && params[5])
                                        params[5].call(this, response);
                                },
                                //early binding
                                oAjax = S.Ajax;

                            scripts.each(function(){

                                var src = S(this).src();

                                src ?

                                    //les fichiers .js distants doivent venir du cache si possible
                                    oAjax.get(src, { response: 'js', cache: 'isset' }, jstate) :

                                    //parentheses obligatoires car sinon le parseur comprend (a ? b : c), jstate()
                                    (S.Parser.js( S(this).html() ), jstate());
                            });
                        }

                        //laisser ça ici a cause du fait que cette condition est a tester apres tout ce qui pourrait
                        //mettre fromCache a true (cas asynchrone de valid 304!)
                        if(!fromCache && params.cache !== 'never' && !localquery){

                            //ne pas regarder Content-Length qui pourrait etre falsifie ce qui entrainerait un depassement de la limite du cache
                            //on regarde la taille textuelle qui est un tres bon indicateur
                            var responseSize = res.length;

                            //il ne sert a rien de stocker le Last-Modified des ressources dont on ne stocke pas le contenu car on
                            //se retrouverais avec de belles 304 vides sous Safari!

                            //si la reponse est a elle seule trop lourde on ne la met pas en cache
                            if(responseSize <= S.Ajax.settings.cacheSize && new RegExp(S.Ajax.settings.cachedMimeType).test(this.getResponseHeader('Content-Type'))){

                                var now = S.Time.now(),
                                    cacheSize;

                                //majoration de la taille du cache
                                while((cacheSize = cache.size + responseSize) > S.Ajax.settings.cacheSize){

                                    var leastUsed,
                                        freqMin,
                                        freq;

                                    Fi(cacheresources, function(url, data){

                                        freq = data.access / now - data.date;

                                        if(freqMin === undefined || freq < freqMin){

                                            freqMin = freq;
                                            leastUsed = url;
                                        }
                                    });

                                    var least = cacheresources[leastUsed];

                                    //liberation rapide de la place avant le garbage collector
                                    least.content = '';

                                    cache.size -= least.size;

                                    delete cacheresources[leastUsed];
                                }

                                cacheresources[params.url] = {

                                    //date de mise en cache
                                    date: now,
                                    //taille en octets de la reponse
                                    size: responseSize,
                                    //nb d'acces a la ressource en cache
                                    access: 0,
                                    lastModified: this.getResponseHeader('Last-Modified') || S.Time.epoch(),
                                    etag: this.getResponseHeader('ETag'),
                                    content: res
                                };

                                cache.size = cacheSize;
                            }
                        }
                    };

                    var buffer4bis = params[4] = function(res){

                        if(buffer4)
                            buffer4.call(this, res);

                        //si fonction determinee pour code recu
                        if(params[this.status])
                            params[this.status].call(this, res);

                        //idee originale provenant de jQuery
                        //http://code.jquery.com/jquery-1.4.4.js
                        (this.status ?
                            S.Math.between(this.status, 200, 207) || this.status === 304 :
                            //status === 0 en local
                            localquery) ?
                                //forcement un success
                                params.success.call(this, res) :
                                params.fail &&
                                    params.fail.call(this, res);
                    },

                    // Determine si la requete necessite un vrai xhr
                    fromCache = false,
                    cache = Cache.ajax,
                    cacheresources = cache.resources,
                    xhr,
                    // URL modifiee de la requete (avec token), ne doit pas reecrire la vraie URL dont on aura besoin pour creer
                    // l'entree dans le nested cache (cf premiere requete en mode 'valid')
                    reqURL;

                    //genere le faux xhr et fini la requete cachee
                    finish = function(statusc, responseTextc){

                        xhr = {

                            status: statusc,
                            responseText: responseTextc
                        };
                        
                        //on n'est pas sur d'avoir affaire a du XML
                        try{ xhr.responseXML = S.Parser.xml(responseTextc); }
                        catch(e){}

                        fromCache = true;

                        //on revient a la version simple
                        params[4] = buffer4bis;

                        params[4].call(xhr, responseTextc);
                    };

                    /*****************
                     LISTE QUIRKS AJAX
                     *****************/

                    /* WebKit (Safari, Chrome) desactive son cache pour les requetes AJAX, resultat:
                     * - isset: fait systematiquement une connexion serveur
                     * - only: retourne une ressource vide
                     * - valid+304: retourne une ressource vide
                     */

                    /* Firefox ne suis pas bien les directives cache-control:
                     * - only: fait systematiquement une connexion serveur
                     */

                    /* Internet Explorer fait de l'hyper-caching:
                     * - tout est systematiquement sorti du cache des que present
                     */

                    /*********************
                     CONSULTATION DU CACHE
                     *********************/
                    // La reponse contient la derniere version de la ressource
                    if(params.cache === 'valid'){
                    	
                    	if(cacheresources[params.url]){
                        	
                        	// max-age=0: a priori le cache doit etre considere comme perime
                            // must-revalidate: on precise qu'il faut revalider car certains caches renvoient des reponses meme perimees
                            // public: la reponse pourra etre cachee partout
                            params.headers.cacheControl = 'max-age=0, must-revalidate, public';
                            
                            // lastModified existe forcement car mis par defaut au jeudi 1er janvier 70
                            params.headers.ifModifiedSince = cacheresources[params.url].lastModified;

                            if(cacheresources[params.url].etag)
                                params.headers.ifNoneMatch = cacheresources[params.url].etag;

                            params[4] = function(res){

                                // ne pas faire le callback normal tout de suite
                                // si 304 car la requete n'est pas finie
                                if(this.status === 304){
                                	
                                	cacheresources[params.url].access++;
                                    finish(304, cacheresources[params.url].content);
                                }
                                else
                                    buffer4bis.call(this, res);
                            };
                        }
                        
                        // Si on ne force pas la main, IE va aller chercher une ressource perimee dans son cache pour la premiere requete
                        // params.url doit rester vierge car sinon pas moyen de faire une entree reutilisable dans le nested cache car unique
                        else
                            reqURL = uurl(params.url);
                    }
                    // La reponse vient ne peut venir que du serveur
                    else if(params.cache === 'never'){

                        params.headers.cacheControl = 'no-cache, no-store';
                        
                        reqURL = uurl(params.url);
                    }
                    // isset/only
                    else{
                        
                        if(cacheresources[params.url]){
                            
                            cacheresources[params.url].access++;
                            finish(200, cacheresources[params.url].content);
                        }
                        else if(params.cache === 'isset')
                            params.headers.cacheControl = 'max-age=' + S.Time.now() + ', public';
                        
                        // On n'essaye meme pas de traiter avce le vrai cache client car seul Safari gere le header 'only-if-cached'
                        else if(params.cache === 'only')
                            finish(200/*, undefined*/);
                    }

                    //si connexion necessaire
                    if(!fromCache){

                        xhr = this.xhr();

                        /********************************
                         MISE EN FORME DES REQUESTHEADERS
                         ********************************/
                        S.Object.extend(params.headers, {

                            contentType: params.content + ';charset=' + params.charset,
                            xPoweredBy: 'JSailor/' + S.About.version,
                            xCacheMode: params.cache
                        });

                        //si data est fourni sous forme d'objet on le serialise
                        if(S.Test.isObject(params.data)){

                            var concat = '';

                            Fi(params.data, function(nom, valeur){

                                concat += (concat ? '&' : '') + nom + '=' + valeur;
                            });

                            params.data = concat;
                        }

                        //mode asynchrone, le binding est a effectuer avant .open car IE verrouille onreadystatechange des l'appel a .open
                        if(params.async)
                            xhr.onreadystatechange = function(){
								
								//sous IE, this pointe sur window et par sur xhr
								if(params[xhr.readyState])
                                    params[xhr.readyState].call(xhr, xhr.responseText);
                            };

                        /***********************
                         DEMARRAGE DE LA REQUETE
                        ***********************/
                        //un try catch pour les tests locaux foireux ^^
                        try{

                            xhr.open(params.method, reqURL || params.url, params.async, params.user, params.password);
							
                            Fi(params.headers, function(header, value){

                                xhr.setRequestHeader(header.charAt(0).toUpperCase() + header.substring(1).replace(/([A-Z])/g, '-$1'), value);
                            });

                            xhr.send(params.data);
                        }
                        catch(e){ Error('Unauthorized request, you\'re probably testing this script locally'); }

                        //mode synchrone
                        if(!params.async)
                            params[4].call(xhr, xhr.responseText);
                    }

                    //pour que l'utilisateur puisse effectuer des actions sur la requete de l'exterieur(abort etc...)
                    return xhr;
                },

                get: function(url, setup, callback){

                    fusionParam({
                        method: 'GET',
                        url: url,
                        data: null
                    }, setup, callback);
                },

                post: function(url, data, setup, callback){

                    fusionParam({
                        method: 'POST',
                        url: url,
                        data: data
                    }, setup, callback);
                }
            };
        })()

    });

    S.Fn = S.JSailor.prototype = (function(){

        var toJSailor = function(expr){

            return S.Test.isJSailor(expr) ? expr : S(expr);
        };

        return {

            constructor: S.JSailor,
            toString: function(){ return '[object JSailor]'; },
            valueOf: function(){ return this.length; },

            ready: function(fn){

                if(this.length === 1 && this.$[0].nodeType === 9){

                    //si utilise bien apres le chargement
                    if( S.Dom.isReady() )
                        fn.call(document);

                    else
                        this.once('JSailorDOMReady', function(){

                            fn.call(this);
                        });
                }
            },

            // lastIndexOf n'a pas de sens car chaque element est unique
            indexOf: function(expr, start){ return this.$.indexOf( toJSailor(expr).$[0], start ); },

            // equivalent a or sans verification des doublons, c'est en realite plus un concat qu'un push
            push: function(expr){ return S( this.$.concat( toJSailor(expr).$ ) ); },

            extend: function(methods){ return S.Object.extend(this, methods); },

            each: function(fn){

                Fl(this.$, fn);

                return this;
            },

            live: function(fn){

                this.each(fn);

                //ne pas faire tout dans le each pour economiser des iterations
                //car on aurait plus de regexp sur S(this)!
                return this.livebind('hatch', fn);
            },

            not: function(expr){

                //on ne peut nier simplement que les expressions simples ou les predicats
                return S.Test.isFunction(expr) || ( S.Test.isString(expr) && Rex.rsimple.test(expr) ) ?
                    Eval.filter(expr, this, false) :
                    S(S.Array.unsetValues(toJSailor(expr).$, this.$));
            },

            and: function(expr){

                return S.Test.isFunction(expr) || S.Test.isString(expr) ?
                    Eval.filter(expr, this, true) :
                    this.not( toJSailor(expr).co() );
            },

            or: function(expr){ return this.not(expr).push(expr); },

            xor: function(expr){ return this.or(expr).not( this.and(expr) ); },

            co: function(){ return S('*').not(this); },

            within: function(expr){ return !this.not(expr).length; },

            clone: function(){

                var newelt = [];

                this.each(function(){

                    newelt.push( this.cloneNode(true) );
                });

                return S(newelt);
            },

            descendants: function(expr){

                if( !expr || S.Test.isString(expr) ){

                    expr = expr ? Eval.clean(expr) : '*';

                    //.descendants('#...')
                    if( Rex.rsimple.test(expr) ){

                        var res = S(),
                            //early binding
                            fchar = expr.charAt(0),
                            reste = expr.substring(1),
                            rfilter = new RegExp('[' + Rex.srfilter + ']');

                        this.each(function(){

                            res = res.or( (function(elt){

                                //ne pas utiliser switch a cause des case sans break qui ne fonctionnenent pas comme attendu
                                
                                return  fchar === '#' && elt.nodeType === 9 ? elt.getElementById( reste ) :
                                        fchar === '@' && elt.nodeType === 9 ? elt.getElementsByName( reste ) :
                                        fchar === '.' && elt.getElementsByClassName ? elt.getElementsByClassName( reste ) :
                                        rfilter.test(expr) ? S(elt).descendants().and(expr) : elt.getElementsByTagName(expr);

                            })(this) );
                        });

                        return res;
                    }

                    else{

                        var indexes = Eval.split(expr);

                               //.descendants('...|...')
                        return indexes[0] + 1 ? this.descendants( expr.substring(0, indexes[0]) )[ Short[expr.charAt(indexes[0])] ]( this.descendants(expr.substring(indexes[0] + 1)) ) :
                               //.descendants('...~...')
                               indexes[1] + 1 ? this.descendants( expr.substring(0, indexes[1]) )[ CSS3.descendants[expr.charAt(indexes[1])] ]( expr.substring(indexes[1] + 1) ) :
                               //.descendants('...#...')
                               this.descendants( expr.substring(0, indexes[2]) ).and( expr.substring(indexes[2]) );
                    }
                }

                //predicat
                else return this.descendants().and(expr);
            },

            children: function(expr){

                var res = [],
                    //early binding
                    oDom = S.Dom;

                this.each(function(){

                    res = res.concat( oDom.childrenOf(this) );
                });

                return S(res).and(expr || '*');
            },

            siblings: function(expr){

                var filter;

                //selecteur
                if( S.Test.isString(expr) && !/younger|older/.test(expr) ){

                    filter = expr;
                    //ne doit plus rien contenir!
                    expr = undefined;
                }

                var res = S(),
                    //early binding
                    oDom = S.Dom;

                this.each(function(){

                    res = res.or( oDom.siblingsOf(this, expr) );
                });

                return res.and(filter || '*');
            },

            //nb arbitraire d'indices
            nth: function(){

                var $ = this.$,
                    res = S();

                Fl(arguments, function(i, index){

                    res = res.or( $[index < 0 ? $.length - index : index] );
                });

                return res;
            },

            remove: function(){

                //plusieurs elements peuvent avoir le meme parent
                var newelt = S();

                this.each(function(){
                    //il y a toujours un parent sauf pour document
                    //mais il serait absurde de faire S(document).remove()
                    var parent = this.parentNode;
                    newelt = newelt.or(parent);
                    parent.removeChild(this);
                });

                return newelt;
            },

            prop: function(name, value){

                //prop(name, value)
                if(value !== undefined)
                    return this.each(value === null ?
                        function(){ delete this[name]; } :
                        function(){ this[name] = value; });

                //prop({...})
                else if( S.Test.isObject(name) ){

                    var root = this;

                    Fi(name, function(key, val){

                        root.prop(key, val);
                    });

                    return root;
                }
                //prop(name)
                else if(this.length)
                    return this.$[0][name];
            },

            attr: function(name, value){

                //attr(name, value)
                if(value !== undefined)
                    return this.each(value === null ?
                        function(){ this.removeAttribute(name); } :
                        function(){ this.setAttribute(name, value); });

                //attr({...})
                else if( S.Test.isObject(name) ){

                    var root = this;

                    Fi(name, function(key, val){

                        root.attr(key, val);
                    });

                    return root;
                }
                //attr(name)
                else if(this.length)
                    return this.$[0].getAttribute(name);

            },

            /*
            //petit hack permettant d'utiliser rgba, hsl et hsla avec IE
            //comme les valeurs relatives ne sont pas possibles sur les couleurs
            //on peut le faire a l'exterieur du each
            if(S.Test.isString(value) && Rex.rcolor.test(value) && Browser.name === 'msie'){

                var rgba = S.Css.toRGBa(value);

                //rgba ou hsla
                if(value.indexOf('a') + 1){

                    //on convertit le ratio de l'opacite sous forme decimale
                    rgba.alpha = Math.ceil(rgba.alpha * 255);

                    var gethexa = function(canal){

                        var hexa = rgba[canal].toString(16);

                        //si la valeur decimale est inferieure a 16 alors la valeur hexa
                        //ne sera que sur un caractere or il nous en faut 2(ex 00)
                        return rgba[canal] < 16 ? hexa + hexa : hexa;
                    },
                    colorahexa = '#' + gethexa('alpha') + gethexa('red') + gethexa('green') + gethexa('blue');

                    prop = 'filter',
                    value = 'progid:DXImageTransform.Microsoft.gradient(startColorstr=' + colorahexa + ',endColorstr=' + colorahexa + ')';
                }
                //conversion hsl -> rgb pour IE qui ne connait pas hsl
                else
                    value = 'rgb(' + rgba.red + ',' + rgba.green + ',' + rgba.blue + ')';
            }

            if(Browser.name === 'msie' && prop === 'filter'){

                changeCSS = function(e, to){

                    S.Object.extend(e.style, {

                        zoom: 1,
                        //pour rgba et hsla uniquement
                        background: 'transparent',
                        filter: to
                    });

                };
            }
            */

            css: (function(){

                var Hacks = {};

                if(!Support.opacity)
                    Hacks.opacity = {

                        set: function(e, value){

                            value = 'alpha(opacity=' + (100 * value) + ')';

                            var style = e.style,
                                filter = style.filter,
                                ralpha = Rex.ralpha;

                            style.zoom = 1;
                            style.filter = !filter ? value :
                                           ralpha.test(filter) ? filter.replace(ralpha, value) :
                                           filter + ' ' + value;
                        },

                        get: function(e){

                            return parseInt( Rex.ralpha.exec(S.Css.getStyle(e, 'filter'))[1] ) / 100;
                        }
                    };

            return function(prop, value){

                //.css({})
                if( S.Test.isObject(prop) ){

                    var root = this;

                    Fi(prop, function(key, val){ root.css(key, val); });

                    return root;
                }
                //.css(prop) ou .css(prop, value)
                else{

                    prop = Fx.cssToJsProp(prop);

                    var addon = S.String.inList(prop, 'scrollTop scrollLeft', ' '),
                        hack = Hacks[prop];

                    //.css(prop, value)
                    if( value !== undefined ){

                        var infos = Fx.evalGeneral(prop, value),
                            unit = infos.unit,
                            changeCSS = hack ? hack.set :
                                        addon ? function(e, to){ e[prop] = to; } :
                                        unit ? function(e, to){ e.style[prop] = to + unit; } :
                                        function(e, to){ e.style[prop] = to; };

                        return this.each(function(){

                            if(this.nodeType === 1 || addon)
                                changeCSS(this, Fx.evalFor(this, prop, infos, false).to);
                        });
                    }
                    //.css(prop)
                    else if(this.length && (this.$[0].nodeType === 1 || addon))
                        return hack ? hack.get(this.$[0]) :
                               addon ? this[prop]() + 'px' :
                               S.Css.getStyle(this.$[0], prop);
                }
            };

            })(),

            switchClass: function(rmclasses, addclasses){

                return this.each(function(){

                    S(this).removeClass(rmclasses).addClass(addclasses);
                });
            },

            hasClass: function(classe){

                var has,
                    oDom = S.Dom;

                this.each(function(){

                    return has = oDom.hasClass(this, classe);
                });

                return has;
            },

            top: function(){

                if(this.length)
                    return S.Css.absoluteTopOf(this.$[0]);
            },

            left: function(){

                if(this.length)
                    return S.Css.absoluteLeftOf(this.$[0]);
            },

            //les livebindings d'event ne sont pas fait via la syntaxe S().liveach(function(){ S(this).bind(); });
            //car cette syntaxe ne permet pas le debinding lorsque un element sort de la collection apres une modification
            //du DOM. Donc dans le cas ou il est possible d'annuler une action liveach n'est pas adaptÃ© mais ce cas correspond
            //uniquement a l'attache d'evenements

            livebind: function(type, fn){

                if(this.regexp){

                    if( !('JSailorHandlerId' in fn) )
                        fn.JSailorHandlerId = ++Handler.handlerId;

                    var regexp = this.regexp,
                        stock = Life.stock,
                        handler = function(){

                            Life.active(regexp, type, fn.JSailorHandlerId);
                        };

                    if(!stock[regexp])
                        stock[regexp] = {

                            mutation: {

                                id: Life.id,
                                set: this
                            },

                            length: 0
                        };

                    stock = stock[regexp];

                    if(!stock[type]){

                        stock.length++;
                        stock[type] = { length: 0 };
                    }

                    stock = stock[type];

                    if(!stock[fn.JSailorHandlerId])
                        stock.length++;

                    stock[fn.JSailorHandlerId] = {

                        action: fn,
                        handler: handler
                    };

                    S(document).bind('DOMSubtreeModified', handler);
                }

                return !Rex.rspecialevent.test(type) ?
                    this.bind(type, fn) : this;
            },

            unlivebind: function(type, fn, bool){

                if(this.regexp && 'JSailorHandlerId' in fn){

                    var stock = Life.stock,
                        data = stock;

                    if((data = data[this.regexp]) && (data = data[type]) && (data = data[fn.JSailorHandlerId])){

                        S(document).unbind('DOMSubtreeModified', data.handler);

                        delete --stock[this.regexp][type].length ?
                                   stock[this.regexp][type][fn.JSailorHandlerId] :

                                   --stock[this.regexp].length ?
                                       stock[this.regexp][type] :

                                       stock[this.regexp];
                    }
                }

                return bool && !Rex.rspecialevent.test(type) ?
                    this.unbind(type, fn) : this;
            },

            life: function(birth, death){

                //ne pas faire tout dans un each pour economiser des iterations
                //car on aurait plus de regexp sur S(this)!
                return this.hatch(birth).die(death);
            },

            tune: function(css, delay, method, callback){

                if(!method || S.Test.isFunction(method)){

                    callback = method;
					//default est un mot clef reserve pb IE
                    method = S.Easing['default'];
                }

                var root = this,
                    stock = Fx.stock;

                method = S.String.camelCase(method, '-');

                Fx.addAnim(delay, method, callback);

                Fi(css, function(prop, value){

                    prop = Fx.cssToJsProp(prop);

                    var infos = Fx.evalGeneral(prop, value);

                    root.each(function(){

                        Fx.addAnimExecuter();

                        if( !('JSailorElementId' in this) )
                            this.JSailorElementId = ++Handler.elementId;

                        var stock = Fx.stock;

                        if( !stock[this.JSailorElementId] )
                            stock[this.JSailorElementId] = {

                                e: this,
                                //obligation d'isolement a cause de finish qui doit iterer
                                prop: {},
                                //nb d'animations en cours sur l'element
                                length: 0
                            };

                        stock = stock[this.JSailorElementId];

                        if( !stock[Fx.id] ){

                            stock.length++;
                            stock[Fx.id] = {

                                stopped: false,
                                //nb de props en cours d'animation sur cet element
                                length: 0
                            };
                        }

                        //si la propriete est deja en cours d'animation sur cet element
                        //on la stoppe (methode similaire a finish) pour l'ancienne
                        //animation et on la remplace par la nouvelle
                        if(stock.prop[prop]){

                            Fl(stock.prop[prop].timers, function(i, timer){

                                clearInterval(timer);
                            });

                            Fx.callback(this.JSailorElementId, prop, true);
                        }
                        
                        stock[Fx.id].length++;

                        var xtrem = Fx.evalFor(this, prop, infos, true);

                        stock.prop[prop] = {

                            id: Fx.id,
                            from: xtrem.from,
                            to: xtrem.to,
                            unit: infos.unit,
                            type: infos.type,
                            timers: []
                        };

                        Fx.active(this.JSailorElementId, prop);
                    });
                });

                return root;
            },

            finish: function(props, toend){

                if(props){

                    if( S.Test.isBoolean(props) ){

                        toend = props;
                        props = undefined;
                    }
                    else
                        props = Fx.cssToJsProp(props);
                }

                var stock = Fx.stock;

                return this.each(function(){

                    if('JSailorElementId' in this){

                        var e = this,
                            elementId = e.JSailorElementId,
                            eltdata = stock[elementId];

                        if(eltdata)
                            Fi(eltdata.prop, function(prop, data){

                                if( !props || S.String.inList(prop, props, ' ') ){

                                    Fl(data.timers, function(i, timer){

                                        clearInterval(timer);
                                    });

                                    if(toend)
                                        S(e).css(prop, data.unit ? data.to + data.unit : data.to);

                                    Fx.callback(elementId, prop, !toend);
                                }
                            });
                    }
                });
            },

            fade: function(to, delay, callback){

                return this.tune({opacity: to}, delay, callback);
            },

            hover: function(fnover, fnout){

                return this.each(fnout ? function(){

                    //initial, le probleme ne vient en fait que du cas initial
                    //ou la souris n'est pas sur l'element
                    fnout.call(this);

                    S(this).mouseover(fnover).mouseout(fnout);

                } : function(){
                //hover({css}) utilisation directe comme pseudo classe css :hover

                    var oldcss = {},
                        //early binding
                        Se = S(this);

                    Fi(fnover, function(prop, val){

                        //on enregistre les vieilles valeurs avant changement
                        oldcss[prop] = Se.css(prop);
                    });

                    Se.hover(function(){ Se.css(fnover); },
                             function(){ Se.css(oldcss); });

                });
            },

            slideUp: function(delay, callback){

                return this.each(function(){

                   if(!Style[this])
                       Style[this] = {};

                   Style[this].overflow = S(this).css('overflow');
                   Style[this].height = S(this).css('height');

                   S(this).css('overflow', 'hidden').tune({ height: '0px' }, delay, callback);
                });
            },

            slideDown: function(delay, callback){

                return this.each(function(){

                   S(this).tune({ height: Style[this].height }, delay, function(){

                     S(this).css('overflow', Style[this].overflow);

                     callback();
                   });
                });
            },

            uniLoad: function(effect, delay){

                this.and('img[unisrc]').each(function(){

                    var Se = S(this),
                        height = Se.height(),
                        width = Se.width(),
                        img = new Image();

                    if(effect === 'fade')
                        Se.css('opacity', 0);
                    else if(effect === 'scale')
                        Se.css({ height: 0, width: 0 });

                    img.src = Se.attr('unisrc'),
                    img.onload = function(){

                        Se
                            .src(this.src)
                            .attr('unisrc', null);

                        if(effect === 'fade')
                            Se.fade(1, delay);
                        else if(effect === 'scale')
                            Se.tune({ height: height+'px', width: width+'px' }, delay);
                    };
                });

                //si this contient autre chose que des 'img[unisrc]' on les retournent quand meme
                return this;
            },

            //idee originale de Mika Tuupola
            //http://www.appelsiini.net/projects/lazyload
            lazyLoad: function(effect, delay){

                var imgs2load = this,
                    checkView = function(){

                        imgs2load = imgs2load.and('img[lazysrc]');

                        imgs2load.length ?

                            imgs2load.and(':in-viewport').each(function(){

                                S(this)
                                    .attr('unisrc', S(this).attr('lazysrc'))
                                    .attr('lazysrc', null)
                                    .uniLoad(effect, delay);
                            }) :

                            S(this).unbind('scroll', checkView);
                    },

                    scrollParents = S(document).or( imgs2load.ancestors(':css(overflow=scroll)') );

                scrollParents.scroll(checkView);

                //premier checkView pour afficher les lazyload deja visibles sans scroll
                //! ne pas declencher un scroll artificiel car pourrait declencher
                //d'autres actions(determinee par l'utilisateur) que la notre
                checkView.call(scrollParents);

                //imgs2load est modifie au fur et a mesure
                return this;
            },

            drag: function(options, callback){

                if(S.Test.isFunction(options)){

                    callback = options;
                    options = undefined;
                }
                if(!options) options = {};

                options = S.Object.extend({

                    method: 'normal'

                }, options);

                return this.css({

                    position: 'absolute',
                    cursor: 'pointer'

                }).mousedown(function(eventmd){

                    var e = S(this),
                        offsetx = eventmd.pageX - e.left(),
                        offsety = eventmd.pageY - e.top(),
                        x, y,
                        move = function(eventmm){

                            y = eventmm.pageY - offsety, x = eventmm.pageX - offsetx;

                            if(options.method === 'normal')
                                e.css({

                                    top: y + 'px',
                                    left: x + 'px'
                                });
                        },

                        end = function(eventmu){

                            e.css('opacity', 1);

                            if(callback)
                                callback.call(e, {

                                    x: eventmu.pageX - eventmd.pageX,
                                    y: eventmu.pageY - eventmd.pageY
                                });
                        };

                    e.css('opacity', 0.5);

                    S(document).mousemove(move).once('mouseup', function(eventmu){

                        S(this).unbind('mousemove', move);

                        options.method === 'ghost' ?
                            e.tune({

                                top: y + 'px',
                                left: x + 'px'

                            }, 1000, function(){ end(eventmu); }) : end(eventmu);
                    });

                    /* empeche la selection */
                    return false;

                });
            },

            zoom: function(){

                return this.and('img').bind('mousewheel DOMMouseScroll', function(event){

                    var delta = 0;

                    //IE/Opera delta multiple de 120
                    if(event.wheelDelta)
                        delta = event.wheelDelta/120;

                    //autres delta multiple de 3 de signe opposé
                    else if(event.detail)
                        delta = -event.detail/3;

                    if(delta){

                        var change = (delta < 0 ? '-' : '+') + ' ' + Math.abs(delta);

                        S(this).css({

                            height: change,
                            width: change
                        });
                    }

                    //empecher le scroll par défaut
                    return false;
                });
            },

            loremIpsum: function(){

                return this.html('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi purus felis, bibendum et ultricies convallis, accumsan sed tortor. Vivamus ut ante nisl, ut posuere sapien. Pellentesque mollis tristique pellentesque. Sed ac justo at dui auctor cursus a eu est. Sed lorem enim, dignissim vitae ornare et, tincidunt et quam. Nullam convallis, purus sed rhoncus rhoncus, augue dolor rutrum ligula, vel sagittis eros augue in purus. Aenean sapien nulla, dignissim ac pharetra a, ornare ac nunc. Ut blandit vulputate nisl non placerat. Nam facilisis tempus tortor eget tristique. Vivamus nunc elit, tincidunt ultrices mattis ac, pellentesque luctus tortor. Ut nec diam at mauris tincidunt ultrices luctus eu arcu. In vitae tellus quis purus convallis pellentesque a ut tellus. Cras pretium adipiscing cursus. Etiam molestie dapibus eros non hendrerit. Vestibulum sagittis, arcu ut interdum lacinia, ipsum nulla auctor nisl, nec tristique turpis enim quis augue. Integer luctus tincidunt magna non elementum. Proin aliquet lacinia ipsum in lobortis. Proin porttitor vestibulum sem, vitae vehicula felis pretium non. Aenean est nibh, scelerisque sed pellentesque a, fringilla quis neque. Maecenas metus metus, semper scelerisque varius ac, cursus non urna. Nulla eget dui sem. Aenean placerat, purus quis condimentum euismod, leo nisi dapibus urna, quis commodo lacus sapien sit amet dui. Mauris facilisis nibh et erat feugiat eu auctor nisl tincidunt. Donec purus purus, interdum sit amet ornare a, commodo a enim. Aenean non nulla tortor. Integer placerat commodo mi eu tempor. Curabitur a velit mi. Proin porta diam ut augue vestibulum pulvinar. Praesent dapibus turpis vel erat mattis id iaculis leo rhoncus. Fusce posuere varius pellentesque. Nunc dignissim consequat justo a bibendum. Maecenas commodo, sapien sit amet congue bibendum, erat quam tempus nibh, tincidunt pulvinar lorem nibh quis purus. Nulla facilisi. Nullam ut molestie arcu. Mauris non elit justo. Fusce ornare facilisis quam id consectetur. Duis bibendum ultrices sem ornare luctus. Nulla eu erat at nunc tristique imperdiet. Vestibulum sem nibh, varius in dictum id, malesuada ut sem. Donec sit amet risus purus, in dignissim justo. Nulla viverra, nisl sit amet aliquam blandit, leo lectus adipiscing est, vel euismod purus nunc a nisi. Vestibulum vitae velit id turpis bibendum congue. Vestibulum aliquet, mi quis facilisis tincidunt, nunc libero tincidunt tellus, vel fringilla mauris mauris vitae metus. Nullam ipsum elit, ultrices et vestibulum id, dignissim sed orci. Pellentesque lobortis tempus urna, eu luctus odio ornare nec. Curabitur erat turpis, vestibulum eu sagittis quis, dictum eget tortor. Nullam auctor enim quis arcu euismod sit amet tempor felis viverra. Integer sit amet tortor in justo iaculis egestas at in mi. Vivamus ante felis, mollis a auctor ac, viverra quis dui. Vivamus a leo a sapien gravida fringilla. Fusce dignissim ligula molestie ligula elementum a tristique quam venenatis. Duis neque diam, cursus id hendrerit id, elementum quis tellus. Phasellus adipiscing, urna non egestas ultrices, odio nisl auctor ipsum, vitae vulputate justo tellus eu eros. Nulla id nisi turpis. Suspendisse a erat ipsum, vitae accumsan tellus. Nullam ultricies libero sed sapien iaculis vitae volutpat massa tempor. Nam eget augue augue. Aenean lacinia, purus id gravida ultrices, sem lorem lobortis neque, vestibulum scelerisque quam massa eu elit. In hac habitasse platea dictumst. Duis dolor urna, varius hendrerit luctus eu, viverra eu nisl. Donec mollis tortor vel justo tristique faucibus. In purus enim, dictum vel ultrices in, aliquet sed enim. Quisque tortor nulla, vehicula et dictum dictum, dictum nec lacus. Phasellus eleifend nulla ac lacus accumsan consequat.');
            }
        };
    })()

    //buggait avec ':nth-child(2n+1)' et ':not(:test)'
    //rajouter regle si caractere special est entre parentheses

    //matche les expressions de base du selecteur( #id, .class, @name, [attr], :filter, :filter-test() )
    Rex.rsimple = new RegExp('^(?:[' + Rex.srfilter + ']?[^' + Rex.srshort + Rex.srcss3 + Rex.srfilter + ']+|\\[[^\\[\\]]+\\]|:[a-z-]+\\(.+\\))$');

    //extension de Filter
    Fl('radio reset checkbox file password submit image'.split(' '), function(i, filtre){

        S.Filter[filtre] = function(e){

            return e.type === filtre;
        };
    });

    //extension de S.Test
    Fi({

        Element: 1,
        Document: 9,
        Fragment: 11

    }, function(fn, nodetype){

        S.Test['is' + fn] = function(val){

            return this.isset(val) && val.nodeType === nodetype;
        };
    });

    Fl('Object Array Function String Number Boolean Text'.split(' '), function(i, fn){

        S.Test['is' + fn] = function(val){

            return this.isset(val) && this.toString(val) === '[object ' + fn + ']';
        };
    });

    //extension de S.String
    Fi({

        trim: [ /^\s+|\s+$/g, '' ],
        stripSpaces: [ /\s/g, '' ],
        singleSpaces: [ /\s+/g, ' ' ],
        stripSlashes: [ /\\([\\'"])/g, '$1' ]

    }, function(fn, carac){

        S.String[fn] = function(str){

            return str.replace(carac[0], carac[1]);
        };
    });

    //S.Dom.firstChildOf et S.Dom.lastChildOf
    Fi({

        first: 'next',
        last: 'previous'

    }, function(fn, sens){

        var prop = fn + 'ElementChild';

        //meme probleme que pour childrenOf, ne pas faire
        //le test a l'exterieur de la fonction
        S.Dom[fn + 'ChildOf'] = function(elt){

            if(prop in elt)
                return elt[prop];

            else{

                for(var cur = elt[fn + 'Child']; cur; cur = cur[sens + 'Sibling'])
                    if(cur.nodeType === 1)
                        return cur;

                return null;
            }
        };
    });

    //extension de S.Css
    Fl('Left Top'.split(' '), function(i, cas){

        var fn = 'absolute' + cas + 'Of',
            offset = 'offset' + cas;

        S.Css[fn] = function(elt){

            return elt.offsetParent ? elt[offset] + arguments.callee(elt.offsetParent) : 0;
        };
    });
    
    //les extensions qui suivent sont toutes sur S.Fn
    //methodes Array-like
    Fl('pop shift reverse'.split(' '), function(i, fn){

        S.Fn[fn] = function(){

            var range = this.$;

            range[fn]();

            return S(range);
        };
    });

    //creation de S.Fn[bind, unbind, fire]
    Fl('bind unbind fire'.split(' '), function(i, fn){

        S.Fn[fn] = function(types, fndata){

            var root = this,
                stock = Life.stock,
                oEvent = S.Event;

            Fl(types.split(' '), function(j, type){

                if( /hatch|die/.test(type) ){

                    if(fn === 'fire'){

                        var data = stock;

                        if(root.regexp && (data = data[root.regexp]) && (data = data[type]))
                            Fi(data, function(handlerId, data){

                                root.each(data.action);
                            });
                    }

                    else
                        root[(fn === 'unbind' ? 'un' : '') + 'livebind'](type, fndata);
                }

                else
                    root.each(function(){ oEvent[fn](this, type, fndata); });
            });

            return this;
        };
    });
    
    S.Fn.once = function(types, fn){
        
        return this.bind(types, function(event){
            
            S(this).unbind(types, arguments.callee);
            
            fn.call(this, event);
        });
    };

    //creation de S.Fn[addClass, removeClass]
    Fi({
        add: function(e, classe){

            if( !S.Dom.hasClass(e, classe) )
                e.className += (e.className ? ' ' : '') + classe;
        },

        remove: function(e, classe){

            e.className = S.String.trim( (' ' + e.className + ' ').replace(' ' + classe + ' ', ' ') );
        }

    }, function(fn, code){

        //autant de classes que d'argument
        S.Fn[fn + 'Class'] = function(){

            var classes = arguments;

            return this.each(function(){

                var e = this;

                Fl(classes, function(i, classe){

                    code(e, classe);
                });
            });
        };
    });

    //alias pour bind() et fire()
    Fl('hatch die abort blur change error focus load reset resize scroll select submit unload click dblclick mousedown mouseup mousemove mouseover mouseout keydown keypress keyup'.split(' '), function(i, fn){

        S.Fn[fn] = function(param){

            return this[ S.Test.isFunction(param) ? 'bind' : 'fire' ](fn, param);
        };
    });

    //alias pour attr()
    Fl('src alt name id'.split(' '), function(i, fn){

        S.Fn[fn] = function(val){

            return this.attr(fn, val);
        };
    });

    //alias pour prop()
    Fi({

        tag: 'nodeName',
        html: 'innerHTML',
        value: 'value',
        check: 'checked'

    }, function(fn, core){

        S.Fn[fn] = function(val){

            return this.prop(core, val);
        };
    });

    //alias pour siblings()
    Fi({
        next: 1,
        previous: -1

    }, function(fn, pos){

        S.Fn[fn] = function(expr){

            return this.siblings(pos).and(expr || '*');
        };
    });

    Fl('younger older'.split(' '), function(i, fn){

        S.Fn[fn + 's'] = function(expr){

            return this.siblings(fn).and(expr || '*');
        };
    });

    //alias pour dom()
    Fi({

        append: function(e, one){ e.appendChild(one); },

        prepend: function(e, one){ e.insertBefore(one, e.firstChild); },

        follow: function(e, one){ e.parentNode.insertBefore(one, e.nextSibling); },

        precede: function(e, one){ e.parentNode.insertBefore(one, e); },

        replace: function(e, one){ e.parentNode.replaceChild(one, e); },

        wrap: function(e, one){

            var parent = e.parentNode,
                temp;

            parent.replaceChild(one, e);

            //cette boucle permet d'enfoncer this au plus profond du html fourni
            for(//utile de cette maniere pour recuperer directement les
                //elements qui remplacent
                var wrp = parent;
                temp = S.Dom.firstChildOf(wrp);
                wrp = temp);

            wrp.appendChild(e);
        }

    }, function(fn, code){

        S.Fn[fn] = function(content){

            var newelt = [],
                //early binding
                oDom = S.Dom,
                insert = S.Test.isString(content) ?
                    oDom.stringToFragment(content) :
                    //il est plus simple de dealer toujours avec un fragment
                    oDom.arrayToFragment( S.Test.isJSailor(content) ? content.$ : [content]);

            this.each(function(){

                var one = insert.cloneNode(true);

                newelt = newelt.concat( oDom.childrenOf(one) );

                code(this, one);
            });

            return S(newelt);
        };
    });

    Fl('first last'.split(' '), function(i, fn){

        var core = fn + 'ChildOf';

        S.Fn[fn + 'Child'] = function(expr){

            var res = [],
                //early binding
                oDom = S.Dom;

            this.each(function(){

                var chld = oDom[core](this);

                if(chld)
                    res.push(chld);
            });

            return S(res).and(expr || '*');
        };
    });

    Fi({

        parent: function(elt){ return elt.parentNode; },
        ancestors: function(elt){ return S.Dom.ancestorsOf(elt); }

    }, function(fn, code){

        S.Fn[fn] = function(expr){

            var res = S();

            this.each(function(){

                res = res.or( code(this) );
            });

            return res.and(expr || '*');
        };
    });

    //.height et .width
    Fi({

        Height: ['top', 'bottom'],
        Width: ['left', 'right']

    }, function(hw, core){

        var name = hw.toLowerCase();

        /* 0 = content
           1 = 0 + padding
           2 = 1 + border
           3 = 2 + margin */

        S.Fn[name] = function(borne){

            if(this.length)

                return this.$[0].nodeType === 9 ?

                            ('inner'+hw in window ? S.Dom.parentWindow(this.$[0])['inner'+hw] : this.descendants( Browser.quirkMode ? 'body' : 'html' )[name]()) :

                            borne === 3 ? this.$[0]['offset' + hw] :
                            borne === 2 ? this[name](3) - parseInt(this.css('margin-' + core[0])) - parseInt(this.css('margin-' + core[1])) :
                            borne === 1 ? this.$[0]['client' + hw] :
                                          this[name](1) - parseInt(this.css('padding-' + core[0])) - parseInt(this.css('padding-' + core[1]));

        };
    });

    /* Création de scrollLeft et scrollTop
     * Utilisation combinée de window.page(X|Y)Offset et elt.scroll(Left|Top)
     * window.page(X|Y)Offset: scroll du document pour tous sauf IE9
     * elt.scroll(Left|Top): scroll de l'élément mais retourne 0 chez certains pour <html>
     */
    Fi({ Left: 'X', Top: 'Y' }, function(dir, coo){

        var name = 'scroll' + dir,
            wname = 'page' + coo + 'Offset';

        S.Fn[name] = function(){

            if(this.length)
                return this.$[0].nodeType === 9 ?
                    (wname in window ? S.Dom.parentWindow(this.$[0])[wname] : this.$[0].body[name]) :
                    //elt.scroll(Left|Top) normal
                    this.$[0][name];
        };
    });

    //les pseudo classes CSS3 nth ne comptent pas les noeuds textes
    //largement inspire de l'API Sizzle
    (function(){

        var testNth = function(expr, eindex){

            if(expr === 'even')
                expr = '2n';
            else if(expr === 'odd')
                expr = '2n+1';

            if(expr.indexOf('n') < 0)
                expr = '0n+' + expr;
            else
                expr = expr.replace(/^(-?)n/, '$11n');

            var split = Rex.rnth.exec(expr),
                coeff = split[1] - 0,
                ord = split[2] - 0 || 0,
                diff = eindex - ord;

            return !coeff ? !diff : !(diff % coeff) && diff / coeff >= 0;
        };

        var indexprop = 'JSailorNode',
            limitprop = 'JSailorIndexed',
            sibling = 'Sibling',
            child = 'Child';

        if(Support.elementFocus){

            sibling = 'Element' + sibling;
            child = 'Element' + child;
        }

        Fl(' Last'.split(' '), function(i, fn){

            var iindexprop = indexprop + fn,
                ilimitprop = limitprop + fn,
                isibling = sibling,
                ichild = child;

            if(fn){

                isibling = 'previous' + isibling;
                ichild = 'last' + ichild;
            }

            else{

                isibling = 'next' + isibling;
                ichild = 'first' + ichild;
            }

            //nth-child et nth-last-child
            (function(){

                var iiindexprop = iindexprop + 'Index',
                    iilimitprop = ilimitprop + 'To';

                S.Filter['nth' + fn + 'Child'] = function(e, expr){

                    var elt = e,
                        indexOne = function(){

                            if(e.nodeType === 1){

                                e[iiindexprop] = ++i;

                                if(e === elt)
                                    return false;
                            }

                            return true;
                        };

                    if(!elt[iiindexprop]){

                        var parent = elt.parentNode,
                            e, i;

                        if(parent[iilimitprop]){

                            e = parent[iilimitprop];
                            i = e[iiindexprop];

                            while((e = e[isibling]) && indexOne());
                        }

                        else{

                            i = 0;

                            for(e = parent[ichild]; e && indexOne(); e = e[isibling]);

                            //si l'arborescence du parent est modifiee, l'indexage devient errone
                            //il faut donc proceder a une reinitialisation
                            S(parent).once('DOMSubtreeModified', function(){

                                for(var e = this[ichild]; e; e = e[isibling]){

                                    if(e.nodeType === 1){

                                        delete e[iiindexprop];

                                        if(e === this[iilimitprop])
                                            break;
                                    }
                                }

                                delete this[iilimitprop];
                            });
                        }

                        parent[iilimitprop] = elt;
                    }

                    return testNth(expr, elt[iiindexprop]);
                };

            })();

            //nth-of-type et nth-last-of-type
            (function(){

                var iiindexprop = iindexprop + 'TypeIndex',
                    iilimitprop = ilimitprop + 'TypeTo';

                S.Filter['nth' + fn + 'OfType'] = function(e, expr){

                    var typename = e.nodeName === 'input' ? 'input_' + e.type : e.nodeName;
                        elt = e,
                        indexOne = function(){

                            if(e.nodeType === 1 && S.Dom.areSameType(elt, e)){

                                e[iiindexprop] = ++i;

                                if(e === elt)
                                    return false;
                            }

                            return true;
                        };

                    if(!elt[iiindexprop]){

                        var parent = elt.parentNode,
                            e, i;

                        if(!parent[iilimitprop])
                            parent[iilimitprop] = {length: 0};

                        if(parent[iilimitprop][typename]){

                            e = parent[iilimitprop][typename];
                            i = e[iiindexprop];

                            while((e = e[isibling]) && indexOne());
                        }

                        else{

                            i = 0;

                            for(e = parent[ichild]; e && indexOne(); e = e[isibling]);

                            S(parent).once('DOMSubtreeModified', function(){

                                for(var e = this[ichild]; e; e = e[isibling]){

                                    if(e.nodeType === 1 && S.Dom.areSameType(elt, e)){

                                        delete e[iiindexprop];

                                        if(e === this[iilimitprop][typename])
                                            break;
                                    }
                                }

                                delete this[iilimitprop][typename];

                                this[iilimitprop]--;

                                if(!this[iilimitprop].length)
                                    delete this[iilimitprop];
                            });

                            parent[iilimitprop].length++;
                        }

                        parent[iilimitprop][typename] = elt;
                    }

                    return testNth(expr, elt[iiindexprop]);
                };

            })();
        });
    })();

    /* BIDOUILLAGE MAISON POUR POUVOIR COMPTER SUR LES EVENEMENTS IMPORTANTS */

    (function(){

        Support.subtreeModified = false;

        var checker = function(){

            Support.subtreeModified = true;
        };

        S(document.createElement('div'))
            .bind('DOMSubtreeModified', checker)
            .append('<span></span>')
            .unbind('DOMSubtreeModified', checker);

    })();

    //on remanie les methodes de manipulation du DOM pour les navigateurs qui ne gere pas les mutations events
    if( !Support.subtreeModified ){

        //evenement sur le parent de l'element
        Fl('attr css prop follow precede replace wrap remove addClass removeClass'.split(' '), function(i, fn){

            var natif = S.Fn[fn],
                exception = S.String.inList(fn, 'attr css prop', ' ');

            S.Fn[fn] = function(){

                //suivant les fn modifiees les arguments ne sont pas les memes d'ou l'utilisation de apply
                var res = natif.apply(this, arguments);

                //pour attr, css, prop, il ne sert a rien de declencher l'evenement
                //si on utilise la fonction comme getter
                if(!exception || 1 in arguments || S.Test.isObject(arguments[0]))
                    this.parent().fire('DOMSubtreeModified');

                return res;
            };
        });

        //evenement sur l'element lui meme
        Fl('append prepend'.split(' '), function(i, fn){

            var natif = S.Fn[fn];

            S.Fn[fn] = function(){

                var res = natif.apply(this, arguments);

                this.fire('DOMSubtreeModified');

                return res;
            };
        });
    }

    //propagation de l'evenement DOMReady
    S(document)
        .bind('DOMSubtreeModified', function(){ Life.id++; })
        .bind('readystatechange', function(){

            if(S.Dom.isReady())
                S(this)
                    .unbind('readystatechange', arguments.callee)
                    .fire('JSailorDOMReady');
        });

    //extensions HTML et propagation de l'evenement DOMExtended
    S(function(){

        //l'extension doit se faire en parallele pour ne pas etre bloquante
        setTimeout(function(){

            Fi(S.Enhancer, function(ext, config){

                if(config.on)
                    S(config.regexp).live(config.each);
            });

            S(document).fire('JSailorDOMExtended');

        }, 0);
    });

    window[container] = S;

})('S', this);