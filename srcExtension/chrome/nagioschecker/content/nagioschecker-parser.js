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
  fetchAllData: function(manager) {
    if (this._servers.length>0) {
  	 this.manager=manager;
    this.problems = [];
    this.fetchServer(0);
    }
  },

  fetchServer: function(pos) {
          this.problems[pos]={"down":[],"unreachable":[],"unknown":[],"warning":[],"critical":[],"_error":false};			
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
	              if (me._servers.length==pos+1) {
	      			  me.manager.handleProblems(me.problems);
	              }
	              else {
	                me.fetchServer(pos+1);
	              }
					});   			
            });        
          });
     }
     else {
	              if (this._servers.length==pos+1) {
	      			  this.manager.handleProblems(this.problems);
	              }
	              else {
	                this.fetchServer(pos+1);
	              }
     }
  },
  loadMissingAlias: function(apos,pos,username,password,callback) {
//		alert("lma:"+apos+" "+pos);
		if (this.missingAliases[pos][apos]) {
			var extinfo = this._servers[pos].urlstatus.replace(/status\.cgi/,"extinfo.cgi");
			var urlExt = extinfo+"?type=1&host="+this.missingAliases[pos][apos];
			var me=this;
	      this.loadDataAsync(urlExt,username,password,false,function (doc2) {
				me.parseAlias(pos,me.missingAliases[pos][apos],doc2);
//				alert("parse "+urlExt);
				me.manager._servers[pos][me.missingAliases[pos][apos]]=me.missingAliases[pos][apos];
				me.loadMissingAlias(apos+1,pos,username,password,callback);				
			});
		}
		else {
		callback();
		}
  },

  loadDataAsync: function(url,username,password,rettext,callback) {
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
            var result=request.responseText;
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
    var me = this;
    this.loadDataAsync(url,username,password,true,function (doc1) {
      var side = me.parseFrame(doc1,url);
		 if (side!="") {
	    me.loadDataAsync(side,username,password,true,function(par) {
		      var urlst = me.parseSide(par,url);
		      callback(urlst);
			});
		}
		else {
		      callback("");
		}
    });
    

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

  parseSide: function(text,url) {

    var urlst = "";
alert(url);
    if (text!=null) {
      var adr = new RegExp('(http|https)\:\/\/([a-zA-Z0-9\-\.\:]*)/', 'g').exec(url);
alert(adr);
      var token = new RegExp('(href|HREF)="(.*)status.cgi','mi').exec(text);
      if (token) {
alert(token[2]);
        var slash = new RegExp('\/(.*)', 'g').exec(token[2]);
alert(slash);
        urlst=(slash[1]) ? adr[1]+"://"+adr[2]+token[2]+"status.cgi" : url+token[2]+"status.cgi";
alert(urlst);
      }

    }
    return urlst;
  },

  parseNagiosServicesHtml: function(pos,doc) {
    if (doc!=null) {
      var ar = getElementsByClass("status",doc,"table");
      if (ar[0]) {
      var viptr = ar[0].childNodes[1].childNodes;
      var lastHost="";
      for (var i = 2; i < viptr.length; i+=2) {
        if (viptr[i] instanceof HTMLTableRowElement) {
          var viptd = viptr[i].childNodes;
          if (viptd.length>1) {                
            var host    = getUglyNodeValue(viptd[1],[0,1,0,1,1,1,0,1,0,0]);
            if (!host) host=lastHost;



            var service = getUglyNodeValue(viptd[3],[0,0,0,0,0,1,0,1,0,0]);

            var acknowledged=false;
            var dischecks=false;
            var disnotifs=false;
            var downtime=false;

            var icons    = getUglyNode(viptd[3],[0,0,0,2,1,1,0]);
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
                    if (tit.match("otification") && tit.match("have been disabled")) {
                      disnotifs=true;
                    }
                    if (tit.match("scheduled downtime")) {
                      downtime=true;
                    }
                  }
                }
              }
            }


            var status  = getUglyNodeValue(viptd[5],[0]);
            var lastCheck  = this.nagiosDateToTimestamp(getUglyNodeValue(viptd[7],[0]));
				    var tmp_dur = getUglyNodeValue(viptd[9],[0]);
            var duration  = this.nagiosDurationToDuration(tmp_dur);
            var durationSec  = this.nagiosDurationToSeconds(tmp_dur);
            var attempt  = getUglyNodeValue(viptd[11],[0]);
            var info  = getUglyNodeValue(viptd[13],[0]);

            var isSoft = false;
            var sto = new RegExp('([0-9]+)\/([0-9]+)','mig').exec(attempt);
            if ((sto) && (parseInt(sto[1])<parseInt(sto[2]))) {
              isSoft=true;
            }         
				    if ((status=="UNKNOWN") || (status=="WARNING") || (status=="CRITICAL")) {
              var tmpo ={"type":"s","host": host,"service":service,"status":this.toLower[status],"lastCheck":lastCheck,"durationSec":durationSec,"duration":duration,"attempt":attempt,"info":info,"acknowledged":acknowledged,"dischecks":dischecks,"disnotifs":disnotifs,"isSoft":isSoft,"downtime":downtime};
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
      var viptr = ar[0].childNodes[1].childNodes;
      var lastHost="";
      for (var i = 2; i < viptr.length; i+=2) {
        if (viptr[i] instanceof HTMLTableRowElement) {
          var viptd = viptr[i].childNodes;
          if (viptd.length>1) {                
            var host    = getUglyNodeValue(viptd[1],[0,1,0,1,1,1,0,1,0,0]);
            if (!host) host=lastHost;

            var acknowledged=false;
            var dischecks=false;
            var disnotifs=false;
            var downtime=false;

            var icons    = getUglyNode(viptd[1],[0,1,0,3,1,1,0]);
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
                    if (tit.match("otification") && tit.match("have been disabled")) {
                      disnotifs=true;
                    }
                    if (tit.match("scheduled downtime")) {
                      downtime=true;
                    }
                  }
                }
              }
            }

            var status  = getUglyNodeValue(viptd[3],[0]);
            var lastCheck  = this.nagiosDateToTimestamp(getUglyNodeValue(viptd[5],[0]));
    				var tmp_dur = getUglyNodeValue(viptd[7],[0]);
            var duration  = this.nagiosDurationToDuration(tmp_dur);
            var durationSec  = this.nagiosDurationToSeconds(tmp_dur);
            var info  = getUglyNodeValue(viptd[9],[0]);
				    if ((status=="DOWN") || (status=="UNREACHABLE")) {
            	this.problems[pos][this.toLower[status]].push({"type":"h","host": host,"service":null,"status":this.toLower[status],"lastCheck":lastCheck,"durationSec":durationSec,"duration":duration,"attempt":null,"info":info,"acknowledged":acknowledged,"dischecks":dischecks,"disnotifs":disnotifs,"isSoft":false,"downtime":downtime});
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