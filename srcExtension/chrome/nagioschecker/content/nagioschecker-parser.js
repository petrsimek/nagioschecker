/* parseUri JS v0.1, by Steven Levithan (http://badassery.blogspot.com)
 * Splits any well-formed URI into the following parts (all are optional):
 * ----------------------
 * source (since the exec() method returns backreference 0 [i.e., the entire match] as key 0, we might as well use it)
 * protocol (scheme)
 * authority (includes both the domain and port)
 * domain (part of the authority; can be an IP address)
 * port (part of the authority)
 * path (includes both the directory path and filename)
 * directoryPath (part of the path; supports directories with periods, and without a trailing backslash)
 * fileName (part of the path)
 * query (does not include the leading question mark)
 * anchor (fragment)
 */
function parseUri(sourceUri){
    var uriPartNames = ["source","protocol","authority","domain","port","path","directoryPath","fileName","query","anchor"];
    var uriParts = new RegExp("^(?:([^:/?#.]+):)?(?://)?(([^:/?#]*)(?::(\\d*))?)?((/(?:[^?#](?![^?#/]*\\.[^?#/.]+(?:[\\?#]|$)))*/?)?([^?#/]*))?(?:\\?([^#]*))?(?:#(.*))?").exec(sourceUri);
    var uri = {};
    
    for(var i = 0; i < 10; i++){
        uri[uriPartNames[i]] = (uriParts[i] ? uriParts[i] : "");
    }
    
    // Always end directoryPath with a trailing backslash if a path was present in the source URI
    // Note that a trailing backslash is NOT automatically inserted within or appended to the "path" key
    if(uri.directoryPath.length > 0){
        uri.directoryPath = uri.directoryPath.replace(/\/?$/, "/");
    }
    
    return uri;
}

function getUglyNodeValue(node,ids) {
  var tmp = node;
  for (var i=0;i<ids.length;i++) {
    try {
      tmp=tmp.childNodes[ids[i]];
    }
    catch (e) {
      return false;
    }
  }
  return tmp.nodeValue;
}

function getUglyNode(node,ids) {
  var tmp = node;
  for (var i=0;i<ids.length;i++) {
    try {
      tmp=tmp.childNodes[ids[i]];
    }
    catch (e) {
      return false;
    }
  }
  return tmp;
}

/*
 *
 * http://www.dustindiaz.com/getelementsbyclass/
 *
 */
function getElementsByClass(searchClass,node,tag) {
	var classElements = new Array();
	if ( node == null )
		node = document;
	if ( tag == null )
		tag = '*';
	var els = node.getElementsByTagName(tag);
	var elsLen = els.length;
	var pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)");
	for (var i = 0, j = 0; i < elsLen; i++) {
		if ( pattern.test(els[i].className) ) {
			classElements[j] = els[i];
			j++;
		}
	}
	return classElements;
}

function NCHParser() {};

NCHParser.prototype = {
  _servers:[],
  callback:null,
  problems: [],
  manager:null,
  timeout:30,
  aliases: [],
  missingAliases: [],
  toLower:{"DOWN":"down","UNREACHABLE":"unreachable","CRITICAL":"critical","WARNING":"warning","UNKNOWN":"unknown"},
  setServers: function(servers) {
    this._servers=servers;
  },
  setTimeout: function (t) {
    this.timeout=t;
  },
//  fetchAllData: function(manager) {
  fetchAllData: function(manager,callback) {
    if (this._servers.length>0) {
  		this.callback=callback;
  	 this.manager=manager;
    this.problems = [];
    this.fetchServer(0);
    }
  },

  fetchServer: function(pos) {
	this.problems[pos]={"down":[],"unreachable":[],"unknown":[],"warning":[],"critical":[],"_error":false,"_time":null};
	this.missingAliases[pos]=[];			
	if (!this._servers[pos].disabled) {
		var urlServices = (this._servers[pos].versionOlderThan20) ? this._servers[pos].urlstatus+"?host=all&servicestatustypes=248" : this._servers[pos].urlstatus+"?host=all&servicestatustypes=28";
		var urlHosts = this._servers[pos].urlstatus+"?hostgroup=all&style=hostdetail&hoststatustypes=12";
		var urlExt = this._servers[pos].urlstatus.replace(/status\.cgi/,"extinfo.cgi");
		var user = this._servers[pos].username;
		var pass = this._servers[pos].password;
		var me = this;
		this.loadDataAsync(urlHosts,user,pass,false,function (doc1) {
			me.parseNagiosHostsHtml(pos,doc1);
            me.loadDataAsync(urlServices,user,pass,false,function (doc2) {
            	me.parseNagiosServicesHtml(pos,doc2);
				me.loadMissingAlias(0,pos,user,pass,function () {
					me.problems[pos]["_time"]=new Date();
					if (me._servers.length==pos+1) {
//						me.manager.handleProblems(me.problems);
						me.callback(me.problems);
					}
					else {
						me.fetchServer(pos+1);
					}
				});   			
            },true);        
		},true);
     }
     else {
		if (this._servers.length==pos+1) {
//			this.manager.handleProblems(this.problems);
			this.callback(this.problems);
		}
		else {
			this.fetchServer(pos+1);
		}
     }
  },

  loadMissingAlias: function(apos,pos,username,password,callback) {
	if (this.missingAliases[pos][apos]) {
		var extinfo = this._servers[pos].urlstatus.replace(/status\.cgi/,"extinfo.cgi");
		var urlExt = extinfo+"?type=1&host="+this.missingAliases[pos][apos];
		var me=this;
		this.loadDataAsync(urlExt,username,password,false,function (doc2) {
				me.parseAlias(pos,me.missingAliases[pos][apos],doc2);
				me.manager._servers[pos][me.missingAliases[pos][apos]]=me.missingAliases[pos][apos];
				me.loadMissingAlias(apos+1,pos,username,password,callback);				
			},false);
	}
	else {
		callback();
	}
  },

  loadDataAsync: function(url,username,password,rettext,callback,remove_nl) {
    var doc=null;
    if (url) {
	    var request=new XMLHttpRequest();

   	  request.open("GET",url,true,username,password);
      var requestTimer = setTimeout(function() {
                                      request.abort();
                                    }, this.timeout*1000); //pulminuty
      var me = this;
      request.onreadystatechange = function (aEvt) {
        if (request.readyState != 4)  { return; }
        clearTimeout(requestTimer);
        try {
          if (request.status != 200)  {
            // Handle error, e.g. Display error message on page
            callback(null);
            return;
          }
        }
        catch (e) {
          callback(null);
          return;
        }
        		
            var result=(remove_nl) ? request.responseText.replace(/[\n\r\t]/g,'') : request.responseText;
            var doc = null;
            if (rettext) {
              doc=result;
            }
            else {
  		        if (result != null) {
			          var iframe=document.createElement('iframe');
			          iframe.style.visibility='hidden';
			          iframe.style.width="0";
			          iframe.style.height="0";
			          document.documentElement.appendChild(iframe);
			          doc=iframe.contentDocument;
   		          document.documentElement.removeChild(iframe);
			          doc.documentElement.innerHTML=result;
				      }
            } 
        callback(doc);
      };
      request.send(null);
    }
    
  },



  downloadStatus: function(url,username,password,callback) {

	var mainUri = parseUri(url);
	if (mainUri.path=="") {
		url+="/";
	}
    var me = this;
    this.loadDataAsync(url,username,password,true,function (doc1) {
		var nuvola = me.parseNuvolaJs(doc1,url);
		if (nuvola!="") {
	    	me.loadDataAsync(nuvola,username,password,true,function(par) {
			var urlst = me.parseNuvolaJsStatus(par,url);
						callback(urlst);
					},false);
		}
		else {

			var side = me.parseFrame(doc1,url);
			if (side!="") {
		    	me.loadDataAsync(side,username,password,true,function(par) {
					var urlst = me.parseSide(par,url,side);
						callback(urlst);
					},false);
			}
			else {
		      callback("");
			}
		}
    	},false);
  },

  nagiosDateToTimestamp: function(ndate) {
    var token = new RegExp('(\d{1,2})\-(\d{1,2})\-(\d{4})\s(\d{1,2}):(\d{1,2}):(\d{1,2})', 'g').exec(ndate);
    var date = new Date();
	  if (token) {
      date.setFullYear(token[3]);
      date.setDate(token[1]);
      date.setMonth(token[2]);
      date.setHours(token[4]);
      date.setMinutes(token[5]);
      date.setSeconds(token[6]);
      return date.getMiliseconds();
	  }
    return ndate;
  },

  nagiosDurationToDuration: function(ndur) {
    var pattern = /(\s*)([0-9]*)d(\s*)([0-9]*)h(\s*)([0-9]*)m(\s*)([0-9]*)s/g;
    var token = ndur.split(pattern);
    var str = "";
	  if (token) {
      var days = token[2];
      var hours = token[4];
      var minutes = token[6];
      var seconds = token[8];
      var str="";
      if (days>0) str+=days+"d";
      if (hours>0) {
        if (str!="") str+=" ";
        str+=hours+"h";
      }
      if (minutes>0) {
        if (str!="") str+=" ";
        str+=minutes+"m";
      }
      if (seconds>0) {
        if (str!="") str+=" ";
        str+=seconds+"s";
      }
      return str;  
	  }
    return ndur;
  },
  nagiosDurationToSeconds: function(ndur) {
    var pattern = /(\s*)([0-9]*)d(\s*)([0-9]*)h(\s*)([0-9]*)m(\s*)([0-9]*)s/g;
    var token = ndur.split(pattern);
    var sec = 0;
		if (token) {
		sec=parseInt(token[2])*86400 + parseInt(token[4])*3600 + parseInt(token[6])*60 + parseInt(token[8]);
	  }
    return sec;
  },




  parseVersion: function(doc) {
    if (doc!=null) {
      var vs = getElementsByClass("version",doc,"div");
      if ((vs!=null) && (vs[0]!=null)) {
        this.version = vs[0].firstChild.nodeValue;
      }
    }
  },

  parseFrame: function(text,url) {
    var ret ="";
    var token = new RegExp('(src|SRC)="(.*)"(.+)(name|NAME)="side"', 'g').exec(text);
    if (token) {
      var normal = new RegExp('^(http|https)\:\/\/(.*)', 'g').exec(token[2]);
      if ((normal) && (normal[1])) {
	        ret=token[2];
  		}
		  else {
        var slash = new RegExp('\/(.*)', 'g').exec(token[2]);
        if ((slash) && (slash[1])) {
          var adr = new RegExp('(http|https)\:\/\/([a-zA-Z0-9\-\.\:]*)/', 'g').exec(url);
          ret=adr[1]+"://"+adr[2]+token[2];
        }
        else {
          ret=url+token[2];
        }
		  }
    }
    return ret;
  },

  parseNuvolaJsStatus: function (text,url) {
    var urlst ="";
    var pattern = /var(\s*)cgipath(\s*)=(\s*)"(.*)";/g;
    var token = text.split(pattern);
    if (token) {
		var cgiUri = parseUri(token[4]+'status.cgi');
		var urlUri = parseUri(url);
        var tmpr = new RegExp('^\/(.*)', 'g').exec(cgiUri.source);
        var isNotRelative = (tmpr) ? tmpr[1] : false;
		if (cgiUri.protocol!="") {
			urlst = cgiUri.source;		
		}
		else {
			if (isNotRelative) {
				urlst = urlUri.protocol + '://' + urlUri.authority;
				urlst += cgiUri.path;
			}
			else {		
				urlst = urlUri.protocol + '://' + urlUri.authority;
				urlst += urlUri.directoryPath + cgiUri.source;
			}
		}
    }
    return urlst;
  },


  parseNuvolaJs: function(text,url) {
    var urlst ="";
    var token = new RegExp('(src|SRC)="(.*)config.js"', 'g').exec(text);
    if (token) {
		var nuvolaJsUri = parseUri(token[2]+'config.js');
		var urlUri = parseUri(url);
        var tmpr = new RegExp('^\/(.*)', 'g').exec(nuvolaJsUri.source);
        var isNotRelative = (tmpr) ? tmpr[1] : false;
		if (nuvolaJsUri.protocol!="") {
			urlst = nuvolaJsUri.source;		
		}
		else {
			if (isNotRelative) {
				urlst = urlUri.protocol + '://' + urlUri.authority;
				urlst += nuvolaJsUri.path;
			}
			else {		
				urlst = urlUri.protocol + '://' + urlUri.authority;
				urlst += urlUri.directoryPath + nuvolaJsUri.source;
			}
		}
    }
    return urlst;
  },


  parseSide: function(text,url,side) {

    var urlst = "";
    if (text!=null) {
      var token = new RegExp('(href|HREF)="(.*)status.cgi','mi').exec(text);
      if (token) {
		var sideUri = parseUri(side);
		var urlUri = parseUri(url);
		var cgiUri = parseUri(token[2]+'status.cgi');
        var tmpr = new RegExp('^\/(.*)', 'g').exec(cgiUri.source);
        var isNotRelative = (tmpr) ? tmpr[1] : false;
		if (cgiUri.protocol!="") {
			urlst = cgiUri.source;		
		}
		else {
			if (isNotRelative) {
				urlst = (sideUri.protocol!="") ? sideUri.protocol + '://' + sideUri.authority : urlUri.protocol + '://' + urlUri.authority;
				urlst += cgiUri.path;
			}
			else {		
				urlst = (sideUri.protocol!="") ? sideUri.protocol + '://' + sideUri.authority : urlUri.protocol + '://' + urlUri.authority;
				urlst += sideUri.directoryPath + cgiUri.source;
			}
		}
      }

    }
    return urlst;
  },

  parseNagiosServicesHtml: function(pos,doc) {
    if (doc!=null) {
      var procstat = getElementsByClass("infoBoxBadProcStatus",doc,"div");
      var disnotifs_global=((procstat[0]) && (procstat[0].childNodes[0]) && (procstat[0].childNodes[0].nodeValue) && (procstat[0].childNodes[0].nodeValue.match("Notifications are disabled"))) ? true : false;
dump ("DISNOT_G:"+disnotifs_global+"\n");
      var ar = getElementsByClass("status",doc,"table");
      if (ar[0]) {
      var viptr = (ar[0].childNodes[1]) ? ar[0].childNodes[1].childNodes : ar[0].childNodes[0].childNodes;
      var lastHost="";
      var lastHostDowntime="";
      for (var i = 1; i < viptr.length; i+=1) {
        if (viptr[i] instanceof HTMLTableRowElement) {
          var viptd = viptr[i].childNodes;
          if (viptd.length>1) {                
            var host_downtime=false;
            var host    = getUglyNodeValue(viptd[0],[0,0,0,0,0,0,0,0,0,0]);
            var icons    = getUglyNode(viptd[0],[0,0,0,1,0,0,0]);
				try {
			  for(var j=0;j<icons.childNodes.length;j++) {
              if (icons.childNodes[j] instanceof HTMLTableCellElement) {
                var ico = getUglyNode(icons.childNodes[j],[0,0]);
                if (ico) {
                  var tit = ico.getAttribute("alt");
                  if (tit) {
                    if (tit.match("scheduled downtime")) {
                      host_downtime=true;
                    }
                  }
                }
              }
			  }
				}
				catch (e) {}

            if ((!host) && (lastHostDowntime)) {
				host_downtime=true;
            }
            if (!host) host=lastHost;

            var service = getUglyNodeValue(viptd[1],[0,0,0,0,0,0,0,0,0,0]);

            var acknowledged=false;
            var dischecks=false;
            var onlypass=false;
            var disnotifs=disnotifs_global;
            var downtime=false;
            var flapping=false;

            var icons    = getUglyNode(viptd[1],[0,0,0,1,0,0,0]);
			if (icons.childNodes) {
            for(var j=0;j<icons.childNodes.length;j++) {
              if (icons.childNodes[j] instanceof HTMLTableCellElement) {
                var ico = getUglyNode(icons.childNodes[j],[0,0]);
                if (ico) {
                  var tit = ico.getAttribute("alt");
                  if (tit) {
                    if (tit.match("acknowledge")) {
                      acknowledged=true;
                    }
                    if (tit.match("hecks") && tit.match("have been disabled") && !tit.match("only passive")) {
                      dischecks=true;
                    }
                    if (tit.match("hecks") && tit.match("have been disabled") && tit.match("only passive")) {
                      onlypass=true;
                    }
                    if (tit.match("otification") && tit.match("have been disabled")) {
                      disnotifs=true;
                    }
                    if (tit.match("scheduled downtime")) {
                      downtime=true;
                    }
                    if (tit.match("flapping")) {
                      flapping=true;
                    }
                  }
                }
              }
            }
			}

            var status  = getUglyNodeValue(viptd[2],[0]);
            var lastCheck  = this.nagiosDateToTimestamp(getUglyNodeValue(viptd[3],[0]));
		    var tmp_dur = getUglyNodeValue(viptd[4],[0]);
            var duration  = this.nagiosDurationToDuration(tmp_dur);
            var durationSec  = this.nagiosDurationToSeconds(tmp_dur);
            var attempt  = getUglyNodeValue(viptd[5],[0]);
            var info  = getUglyNodeValue(viptd[6],[0]);


            var isSoft = false;
            var sto = new RegExp('([0-9]+)\/([0-9]+)','mig').exec(attempt);
            if ((sto) && (parseInt(sto[1])<parseInt(sto[2]))) {
              isSoft=true;
            }         
			var attemptInt = (sto) ? parseInt(sto[1]) : 0;
			if (host_downtime) {
				downtime=true;
			}
            if ((status=="UNKNOWN") || (status=="WARNING") || (status=="CRITICAL")) {
              var tmpo ={"type":"s","host": host,"service":service,"status":this.toLower[status],"lastCheck":lastCheck,"durationSec":durationSec,"duration":duration,"attempt":attempt,"attemptInt":attemptInt,"info":info,"acknowledged":acknowledged,"dischecks":dischecks,"disnotifs":disnotifs,"isSoft":isSoft,"downtime":downtime,"flapping":flapping,"onlypass":onlypass};
	            this.problems[pos][this.toLower[status]].push(tmpo);
  					  if ((this.manager._servers[pos].getAliases) && (!this.manager._servers[pos].aliases[host])) {
						    this.missingAliases[pos].push(host);
					    }
				}
            lastHost=host;
          }
        }
      }
      }
      else {
        this.problems[pos]["_error"]=true;
      }
    }
    else {
        this.problems[pos]["_error"]=true;
    }
  },

  parseAlias: function(pos,host,doc) {
    var datas = getElementsByClass("data(.*)",doc,"*");
    this.manager._servers[pos].aliases[host]=((datas[1]) && (datas[1].childNodes[0].nodeValue)) ? datas[1].childNodes[0].nodeValue : host;
  },


  parseNagiosHostsHtml: function(pos,doc) {
    if (doc!=null) {
      var ar = getElementsByClass("status",doc,"table");
      if (ar[0]) {
      var viptr = (ar[0].childNodes[1]) ? ar[0].childNodes[1].childNodes : ar[0].childNodes[0].childNodes;
      var lastHost="";
      for (var i = 1; i < viptr.length; i+=1) {
        if (viptr[i] instanceof HTMLTableRowElement) {
          var viptd = viptr[i].childNodes;
          if (viptd.length>1) {                
            var host    = getUglyNodeValue(viptd[0],[0,0,0,0,0,0,0,0,0,0]);
            if (!host) host=lastHost;
            var acknowledged=false;
            var dischecks=false;
            var disnotifs=false;
            var downtime=false;
            var flapping=false;

            var icons    = getUglyNode(viptd[0],[0,0,0,1,0,0,0]);
			if (icons.childNodes) {
            for(var j=0;j<icons.childNodes.length;j++) {
              if (icons.childNodes[j] instanceof HTMLTableCellElement) {
                var ico = getUglyNode(icons.childNodes[j],[0,0]);

                if (ico) {
                  var tit = ico.getAttribute("alt");
                  if (tit) {
                    if (tit.match("acknowledge")) {
                      acknowledged=true;
                    }
                    if (tit.match("hecks") && tit.match("have been disabled")) {
                      dischecks=true;
                    }
                    if (tit.match("otification") && tit.match("have been disabled")) {
                      disnotifs=true;
                    }
                    if (tit.match("scheduled downtime")) {
                      downtime=true;
                    }
                    if (tit.match("flapping")) {
                      flapping=true;
                    }
                  }
                }
              }
            }
			}

            var status  = getUglyNodeValue(viptd[1],[0]);
            var lastCheck  = this.nagiosDateToTimestamp(getUglyNodeValue(viptd[2],[0]));
			var tmp_dur = getUglyNodeValue(viptd[3],[0]);
            var duration  = this.nagiosDurationToDuration(tmp_dur);
            var durationSec  = this.nagiosDurationToSeconds(tmp_dur);
            var info  = getUglyNodeValue(viptd[4],[0]);
				    if ((status=="DOWN") || (status=="UNREACHABLE")) {
            	this.problems[pos][this.toLower[status]].push({"type":"h","host": host,"service":null,"status":this.toLower[status],"lastCheck":lastCheck,"durationSec":durationSec,"duration":duration,"attempt":null,"attemptInt":null,"info":info,"acknowledged":acknowledged,"dischecks":dischecks,"disnotifs":disnotifs,"isSoft":false,"downtime":downtime,"flapping":flapping,"onlypass":false});
					    if ((this.manager._servers[pos].getAliases) && (!this.manager._servers[pos].aliases[host])) {
						    this.missingAliases[pos].push(host);
					    }

				    }
            lastHost=host;
          }
        }
      }
    }
    else {
        this.problems[pos]["_error"]=true;
    }
    }
    else {
        this.problems[pos]["_error"]=true;
    }
  }

}