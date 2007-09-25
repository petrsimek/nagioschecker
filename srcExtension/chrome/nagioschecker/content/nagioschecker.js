var _showTimerID = null;
var _tab = null;
		var ev2pop = {
					  'nagioschecker-popup':'nagioschecker-popup',
					  'nagioschecker-popup-down':'nagioschecker-popup-down',
					  'nagioschecker-popup-unreachable':'nagioschecker-popup-unreachable',
					  'nagioschecker-popup-unknown':'nagioschecker-popup-unknown',
					  'nagioschecker-popup-warning':'nagioschecker-popup-warning',
					  'nagioschecker-popup-critical':'nagioschecker-popup-critical',
					  'nagioschecker-panel':'nagioschecker-popup',
					  'nagioschecker-hosts-down':'nagioschecker-popup-down',
					  'nagioschecker-hosts-unreachable':'nagioschecker-popup-unreachable',
					  'nagioschecker-services-unknown':'nagioschecker-popup-unknown',
					  'nagioschecker-services-warning':'nagioschecker-popup-warning',
					  'nagioschecker-services-critical':'nagioschecker-popup-critical'};

var treeView = {
    rowCount : 10000,
    getCellText : function(row,column){
      if (column.id == "namecol") return "Row "+row;
      else return "February 18";
    },
    setTree: function(treebox){ this.treebox = treebox; },
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
};

var nagioschecker = null;
var nagioscheckerLoad = function() {

  nagioschecker = new NCH();

  Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .addObserver(nagioschecker, "nagioschecker:preferences-changed", false);


  nagioschecker.start();
};
var nagioscheckerUnload = function() {
	
  if (nagioschecker != null) {
    Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .removeObserver(nagioschecker, "nagioschecker:preferences-changed");
    nagioschecker.stop();
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var enumerator = wm.getEnumerator("");
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if (win.nagioschecker) {
        win.setTimeout(function() {
          win.nagioschecker.reload(true);          
        },30);

      }

    }
  }
  nagioschecker = null;
}

function NCH() {};

NCH.prototype = {
  bundle: null,
  url: null,
//  update_interval:null,
  worktime_from:null,
  worktime_to:null,
  _servers:[],
  urlSide: "",
  urlServices: "",
  urlHosts: "",
  urlStatus:"",
//  one_window_only: false,
  timeoutId: null,
  isStopped:false,
//  timoutSec:30,
//  sndWarning:null,
//  sndCritical:null,
//  sndDown:null,
  win:window,
  preferences: Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch),


  oldProblems:{},

//  infoType:0,
//  infoWindowType:0,
  showSb:{},
//  showColInfo:true,
//  showColAlias:false,
//  showColFlags:false,
//  play_sound: 2,
//  blinking: 2,
//  doubleclick: 0,
//  oneclick: 0,
//  filterOnly: 0,
//  filterOutAck: true,
//  filterOutDisNot: false,
//  filterOutDisChe: true,
//  filterOutSoftStat: false,
//  filterOutDowntime: false,
//  filterOutServOnDown: false,
//  filterOutServOnAck: false,
//  filterOutREHosts: false,
//  filterOutREServices: false,
//  filterOutREHostsValue: "",
//  filterOutREServicesValue: "",
//  filterOutREHostsReverse: false,
//  filterOutREServicesReverse: false,
  filterOutAll:{"down":false,"unreachable":false,"uknown":false,"warning":false,"critical":false},
//  filterOutFlapping: true,
  soundBT:{},
  parser: null,
  pt:["down","unreachable","unknown","warning","critical"],
  results:{},
  isMoving : false,
  startX : -1,
  startY : -1,
  undockedWindow : null,

	pref:{},
_showTimerID: null,
_refreshTimer: null,

  handleMouseOver: function (aEvent) {
dump('\n'+nagioschecker.openedPops.length+' out'+aEvent.target.id);
	if (_showTimerID ) {
		return;
	}
		if ((aEvent.target.id == "nagioschecker-panel")||(aEvent.target.localName == "label")||(aEvent.target.localName == "popup")) {
dump(' '+aEvent.target.localName+":"+_tab+":"+ev2pop[aEvent.target.id]);
		if (aEvent.target == _tab) {
			return;
		}
		_tab = aEvent.target;
		var relPopup=document.getElementById(ev2pop[aEvent.target.id]);
		var callback = function(self) {
			if (relPopup) {
//alert(tab.id)				
				relPopup.showPopup(_tab,  -1, -1, 'popup', 'topleft' , 'bottomleft');
//dump('\npravd vboxid'+_tab.id+'-id');
//dump(' '+vb.id);
//dump('PRED: clientHeight:'+vb.clientHeight+' scrollHeight:'+vb.scrollHeight+' height:'+vb.height+'\n');
//dump('PRED: clientHeight:'+vb.clientHeight+' scrollHeight:'+vb.scrollHeight+' height:'+vb.height+'\n');

				nagioschecker.openedPops.push(ev2pop[aEvent.target.id]);
			}
		};
		_showTimerID = window.setTimeout(callback, 10, this);
	}
  },

  openedPops : [],
  handleMouseOut: function (aEvent) {
dump('\nout'+aEvent.target.id);
	var rel = aEvent.relatedTarget;
	var popupMain = document.getElementById('nagioschecker-popup');
	var popupDown = document.getElementById('nagioschecker-popup-down');
	var popupUnreachable = document.getElementById('nagioschecker-popup-unreachable');
	var popupUnknown = document.getElementById('nagioschecker-popup-unknown');
	var popupCritical = document.getElementById('nagioschecker-popup-critical');
	var popupWarning = document.getElementById('nagioschecker-popup-warning');
	
	if (rel) {
		while (rel) {
dump(' '+rel.localName+':'+rel.id);
			if (rel == _tab || rel == popupMain || rel == popupDown || rel == popupUnreachable || rel == popupUnknown || rel == popupCritical || rel == popupWarning)
				return;
			rel = rel.parentNode;
		}
dump('['+aEvent.target.id+']');
		nagioschecker.abort();
		return;
	}
	var x = aEvent.screenX;
	var y = aEvent.screenY;
	if (nagioschecker.isEntering(x, y, popupMain, true) || nagioschecker.isEntering(x, y, popupDown, true) ||
		nagioschecker.isEntering(x, y, popupUnreachable, true) || nagioschecker.isEntering(x, y, popupUnknown, true) ||	    
		nagioschecker.isEntering(x, y, popupCritical, true) || nagioschecker.isEntering(x, y, popupWarning, true) ||	    
		nagioschecker.isEntering(x, y, _tab, true))
		return;
	nagioschecker.abort();   	
  },
  abort: function() {
dump('ABORT');
	if (_showTimerID) {
		window.clearTimeout(_showTimerID);
		_showTimerID = null;
	}
	if (_tab) {
		for (var i in nagioschecker.openedPops) {
			if (nagioschecker.openedPops[i])
				document.getElementById(nagioschecker.openedPops[i]).hidePopup();
				
		}
		nagioschecker.openedPops = [];
		
	}
	_tab = null;  	
  },
  
  isEntering: function(aScreenX,aScreenY,aElement,aAllowOnEdge) {
	var x = aElement.boxObject.screenX;
	var y = aElement.boxObject.screenY;
	var c = aAllowOnEdge ? 1 : 0;
dump('x:'+x+' y:'+y+' ax:'+aScreenX+' ay:'+aScreenY+'\n');
	if (x < aScreenX - c && aScreenX < x + aElement.boxObject.width + c && 
		y < aScreenY - c && aScreenY < y + aElement.boxObject.height + c) {
		return true;
	}
	return false;   	
  },
  
  _super: null,
  start : function() {
//		this._super=document.getElementById('my-tree');
//  		this._super.view=treeView;
	if (gMini) {
   var resizer = document.getElementById('nagioschecker-mover');

       window.addEventListener('mouseup', 
                function(event) { nagioschecker.onUndockUp(event) }, false);
       window.addEventListener('mousedown', 
                function(event) { nagioschecker.onUndockDown(event) }, false);
       window.addEventListener('mousemove', 
                function(event) { nagioschecker.onUndockMove(event) }, false);
	}
    this.parser = new NCHParser();
    this.bundle = document.getElementById("nch-strings");
    this.setNoData(null);
    try{
      var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
      sound.init();
    }
    catch(e) {}

		var me = this;
		setTimeout(function() {
			me.reload(true);
		},1000);
  },

  adjustSize : function(event, firstTime) {

        var currentX = window.screenX;
        var currentY = window.screenY;
        var currentWidth = window.outerWidth;
        var right = currentX + currentWidth; 
        sizeToContent();

        var newWidth = window.outerWidth;
        var left = right - newWidth;
        
        moveTo(left, currentY);
        
        var me = this;
        if (firstTime) {
            // doing sizeToContent once often leaves the minimode in incorrect state
            // let's do it one more time
            setTimeout(function() { me.adjustSize(event); }, 100);
        }

    },

  
    onUndockMove : function(event) {
       if (!this.isMoving) return;

        var currentX = event.screenX;
        var currentY = event.screenY;
        var deltaX = currentX - this.startX;
        var deltaY = currentY - this.startY;
        this.undockedWindow.moveBy(deltaX, deltaY);

        this.startX = currentX;
        this.startY = currentY;


    },

    onUndockUp : function(event) {
        if (!this.isMoving) return;
        this.isMoving = false;
    },

    onUndockDown : function(event) {
        if (event.target.tagName != 'titlebar') return;
        if (this.isMoving) return;
        this.isMoving = true;
        this.startX = event.screenX;
        this.startY = event.screenY;

        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                    .getService(Components.interfaces.nsIWindowMediator);
        this.undockedWindow = wm.getMostRecentWindow('nch:undocked');
        if (!this.undockedWindow) return;

    },

  isFirstWindow: function() {
  
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    var win = enumerator.getNext();
    return (win==window);
  },

  getFirstWindow: function() {
  
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    return enumerator.getNext();
  },


  stop : function() {
  },


  switchStop: function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    var cnt=0;
	var firstWin = null;
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if (cnt==0) {
      	firstWin=win;
	    firstWin.nagioschecker.isStopped = (!firstWin.nagioschecker.isStopped);
      }
      else {
      	if (win.nagioschecker) {
	      	win.nagioschecker.isStopped = firstWin.nagioschecker.isStopped;
      	}
      }
      if (win.document) {
      	
	    win.document.getElementById('nagioschecker-stoprun').setAttribute("label",(firstWin.nagioschecker.isStopped) ? this.bundle.getString("runagain") : this.bundle.getString("stop"));
      }
		win.nagioschecker.resetBehavior(true);
      cnt++;
	}

    this.preferences.setBoolPref("extensions.nagioschecker.stopped",firstWin.nagioschecker.isStopped);
    firstWin.nagioschecker.reload(true);
  },

  reload : function(firstRun) {

  	this.pref = this.loadPref("extensions.nagioschecker.",{
			sound_warning:['int',0],
			sound_warning_path:['char','chrome://nagioschecker/content/warning.wav'],
			sound_critical:['int',0],
			sound_critical_path:['char','chrome://nagioschecker/content/critical.wav'],
			sound_down:['int',0],
			sound_down_path:['char','chrome://nagioschecker/content/hostdown.wav'],
			stopped:['bool',false],
			timeout:['int',30],
			info_type:['int',0],
			info_window_type:['int',0],
			show_statusbar_down:['bool',true],
			show_statusbar_unreachable:['bool',true],
			show_statusbar_warning:['bool',true],
			show_statusbar_critical:['bool',true],
			show_statusbar_unknown:['bool',true],
			filter_out_all_down:['bool',false],
			filter_out_all_unreachable:['bool',false],
			filter_out_all_warning:['bool',false],
			filter_out_all_critical:['bool',false],
			filter_out_all_unknown:['bool',false],
			sounds_by_type_down:['bool',true],
			sounds_by_type_unreachable:['bool',true],
			sounds_by_type_warning:['bool',true],
			sounds_by_type_critical:['bool',true],
			sounds_by_type_unknown:['bool',true],
			show_window_column_information:['bool',true],
			show_window_column_flags:['bool',true],
			show_window_column_alias:['bool',false],
			filter_out_acknowledged:['bool',true],
			filter_out_disabled_notifications:['bool',true],
			filter_out_disabled_checks:['bool',true],
			filter_out_soft_states:['bool',false],
			filter_out_downtime:['bool',false],
			filter_out_services_on_down_hosts:['bool',false],
			filter_out_services_on_acknowledged_hosts:['bool',false],
			filter_out_regexp_hosts:['bool',false],
			filter_out_regexp_hosts_value:['char',''],
			filter_out_regexp_hosts_reverse:['bool',false],
			filter_out_regexp_services:['bool',false],
			filter_out_regexp_services_value:['char',''],
			filter_out_regexp_services_reverse:['bool',false],
			filter_out_flapping:['bool',false],
			refresh:['int',5],
			worktimefrom:['char','08:00'],
			worktimeto:['char','18:00'],
			play_sound:['int',2],
			blinking:['int',2],
			click:['int',0],
			one_window_only:['bool',false],
			});

    if (gMini) {
		this.adjustSize(null,true);
    }

    this._servers=[];
    var pm = new  NCHPass();

    this.emptyInfo=[];

    try {


      for(var i=0;i<20;i++) {
        
        var surl = this.preferences.getCharPref("extensions.nagioschecker."+(i+1)+".url");
        if (surl) {
        try {
          var pPass = this.preferences.getBoolPref("extensions.nagioschecker."+(i+1)+".plainpass");
        }
        catch (e2) {
          var pPass=false;
        }
        try {
          var gAli = this.preferences.getBoolPref("extensions.nagioschecker."+(i+1)+".getaliases");
        }
        catch (e2) {
          var gAli=false;
        }
        try {
          var gDis = this.preferences.getBoolPref("extensions.nagioschecker."+(i+1)+".disabled");
        }
        catch (e2) {
          var gDis=false;
        }
          var auth = pm.getAuth((i+1));
          this._servers.push({
                  url:surl,
                  name:this.preferences.getCharPref("extensions.nagioschecker."+(i+1)+".name"),
                  urlstatus:this.preferences.getCharPref("extensions.nagioschecker."+(i+1)+".urlstatus"),
                  username:(pPass) ? this.preferences.getCharPref("extensions.nagioschecker."+(i+1)+".username") : ((auth.user) ? auth.user : ''),
                  password:(pPass) ? this.preferences.getCharPref("extensions.nagioschecker."+(i+1)+".password") : ((auth.password) ? auth.password : ''),
                  versionOlderThan20:this.preferences.getBoolPref("extensions.nagioschecker."+(i+1)+".vot20"),
                  getAliases:gAli,
                  aliases:{},
                  disabled:gDis
                  });
        }
      }
    }
    catch(e) {
    }

    
    this.parser.setServers(this._servers);

	this.isStopped = this.pref.stopped;

    this.parser.setTimeout(this.pref.timeout);

    for (var i in this.pt) {
    	this.filterOutAll[this.pt[i]]=this.pref['filter_out_all_'+this.pt[i]];
    	this.showSb[this.pt[i]]=this.pref['show_statusbar_'+this.pt[i]];
    	this.soundBT[this.pt[i]]=this.pref['sounds_by_type_'+this.pt[i]];
    }

	sWorktimeFrom = this.pref.worktimefrom;
	while (sWorktimeFrom.length < 5) { // fill up to 5 chars (08:40)
		sWorktimeFrom = "0"+sWorktimeFrom;
	}
	this.worktime_from = ( (sWorktimeFrom.substring(0,2)*60) + (sWorktimeFrom.substring(3,5)*1) )*60;

	sWorktimeTo = this.pref.worktimeto;
	while (sWorktimeTo.length < 5) { // fill up to 5 chars (08:40)
		sWorktimeTo = "0"+sWorktimeTo;
	}
	this.worktime_to = ( (sWorktimeTo.substring(0,2)*60) + (sWorktimeTo.substring(3,5)*1) )*60;

    document.getElementById('nagioschecker-stoprun').setAttribute("label",(this.isStopped) ? this.bundle.getString("runagain") : this.bundle.getString("stop"));

    var menuMain = document.getElementById('nagioschecker-menu');
    var menuItems = menuMain.childNodes;
    while (menuItems[0].id!="menu-separe") menuMain.removeChild(menuItems[0]);
  
    var separe = document.getElementById('menu-separe');

    var srvlen = this._servers.length;

    if (srvlen>1) {
      var me  = document.createElement("menu");
    	me.setAttribute("label", this.bundle.getString("goto")+" Nagios");    
      var mp1 = document.createElement("menupopup");
      me.appendChild(mp1);
		    menuMain.insertBefore(me,separe);
      var me  = document.createElement("menu");
    	me.setAttribute("label", this.bundle.getString("goto")+" "+this.bundle.getString("services"));    
      var mp2 = document.createElement("menupopup");
      me.appendChild(mp2);
		    menuMain.insertBefore(me,separe);
      var me  = document.createElement("menu");
    	me.setAttribute("label", this.bundle.getString("goto")+" "+this.bundle.getString("hosts"));    
      var mp3 = document.createElement("menupopup");
      me.appendChild(mp3);
		    menuMain.insertBefore(me,separe);
    }
    

      for(var i=0;i<srvlen;i++) {

        var gotoN = document.createElement("menuitem");
        gotoN.setAttribute("label", (srvlen>1) ? this._servers[i].name : this.bundle.getString("goto")+" Nagios");    
        gotoN.setAttribute("oncommand", "nagioschecker.openTab('"+this._servers[i].url+"');");    

        if (srvlen>1) {
          mp1.appendChild(gotoN);
        }
        else {
	  	    menuMain.insertBefore(gotoN,separe);
        }
        var gotoS = document.createElement("menuitem");
        gotoS.setAttribute("label",  (srvlen>1) ? this._servers[i].name : this.bundle.getString("goto")+" "+this.bundle.getString("services"));    
        gotoS.setAttribute("oncommand", "nagioschecker.openTab('"+this.createUrl(this._servers[i],'service_problems')+"');");    
        if (srvlen>1) {
          mp2.appendChild(gotoS);
        }
        else {
  		    menuMain.insertBefore(gotoS,separe);
        }

        var gotoH = document.createElement("menuitem");
        gotoH.setAttribute("label",  (srvlen>1) ? this._servers[i].name : this.bundle.getString("goto")+" "+this.bundle.getString("hosts"));    
        gotoH.setAttribute("oncommand", "nagioschecker.openTab('"+this.createUrl(this._servers[i],'host_problems')+"');");    
        if (srvlen>1) {
          mp3.appendChild(gotoH);
        }
        else {
  		    menuMain.insertBefore(gotoH,separe);
        }



    }

    if (srvlen==0) {
      separe.setAttribute("hidden","true");
      document.getElementById('nagioschecker-stoprun').setAttribute('hidden','true');
      document.getElementById('nagioschecker-reload').setAttribute('hidden','true');
      document.getElementById('menu-separe2').setAttribute('hidden','true');
    }

    this.resetBehavior(true);    
		this.doUpdate();


  },


	doUpdate: function() {

		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		if (this._servers.length>0) {
			if (!this.isStopped) {
				var firstWin = this.getFirstWindow();
				if (firstWin==window) {
					this.setLoading(true);
					this.parser.fetchAllData(this);
				}
				else {
					if ((this.pref.one_window_only) && (!gMini)){
						this.setIcon("disabled");
					}
					else {
						firstWin.nagioschecker.setLoading(true);
						firstWin.nagioschecker.parser.fetchAllData(nagioschecker);
					}
				}
			}
			else {
				this.updateAllClients(this.results);
      		}
		}
		else {
			this.updateAllClients(null);
		}
	},

  createUrl: function(server,type) {
		var url="";
		switch (type) {
			case "host_problems":
	        url = server.urlstatus+"?hostgroup=all&style=hostdetail&hoststatustypes=12";
			break;
			case "service_problems":
	        if (server.versionOlderThan20) {
	          url = server.urlstatus+"?host=all&servicestatustypes=248";
	        }
	        else {
	          url = server.urlstatus+"?host=all&servicestatustypes=28";
	        }
			break;
		}
		return url;
	},

	createUrlDevice: function(i,host,service) {
		var extinfo = this._servers[i].urlstatus.replace(/status\.cgi/,"extinfo.cgi");
		var url = extinfo+"?type="+((service) ? "2" : "1")+"&host="+escape(host);
		if (service) {
			url+="&service="+escape(service);
		}
		return url;
	},

  // plan next check
  setNextCheck: function(){
	var me = this;
	this.timeoutId = setTimeout(
			function() {
				if (me.isCheckingTime()) {
					me.setIcon("loading");
					me.parser.fetchAllData(me);
				} else {
					me.setNextCheck();
					me.setIcon("sleepy");
				}
			}
			, this.pref.refresh*60000
		);
  },

  handleProblems: function(probs) {
	if (document) {
		this.enumerateStatus(probs);
		this.updateAllClients(this.results);
		var reallyPlay=false;
		for(var i=0;i<this.pt.length;i++) {
			if ( 
				((this.pref.play_sound==1) && (this.soundBT[this.pt[i]]) && (this.results[this.pt[i]][2]))
				||
				((this.pref.play_sound==2) && (this.soundBT[this.pt[i]]) && (this.results[this.pt[i]][1]))
			) {
				reallyPlay=true;
			}
		}

		if (reallyPlay) {
			this.playSound(this.results);
		}
		this.setNextCheck();

	}
	},

  updateAllClients: function(paket) {
  
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    var cnt=0;
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if (win.nagioschecker) {
        if (!this.isStopped) {        
          if ((this.pref.one_window_only) && (cnt>0) && (!win.gMini)) {
          	win.nagioschecker.setNoData("");
            win.nagioschecker.setIcon("disabled");
          }
          else {
            if (paket==null) {
              win.nagioschecker.setNoData("noProblem");
            }
            else {
              win.nagioschecker.updateStatus(paket,false);
            }
          }
        }
        else {
          win.nagioschecker.setNoData("");
          win.nagioschecker.setIcon("stop");
          win.nagioschecker.resetBehavior(true);
        }
      }
      cnt++;
    }
  },

  observe : function(subject, topic, data) {
  	if (topic == "nagioschecker:preferences-changed") {
  		setTimeout("if (nagioschecker != null) nagioschecker.reload(false);", 300);
  	}
  },

  openAllTabs: function(what) {
		      for(var i = 0;i<this._servers.length;i++) {
		        switch (what) {
		          case "hosts":
                if ((this.results["down"][3][i]>0) || (this.results["unreachable"][3][i]>0)) {
		              this.openTab(this.createUrl(this._servers[i],'host_problems'));
                }
		          break;
          		 case "services":
                if ((this.results["critical"][3][i]>0) || (this.results["warning"][3][i]>0) || (this.results["unknown"][3][i]>0)) {
						      this.openTab(this.createUrl(this._servers[i],'service_problems'));
                }
            	 break;
          		 default:
            		this.openTab(this._servers[i].url);
            	 break;
        		  }	
	   		}
  },

  popupOpened: function() {
//	document.getElementById('my-tree').view = treeView;

//    this.resetTooltips(false);
  },
  popupClosed: function() {
//    this.resetTooltips(true);
  },

  hideNchPopup: function(popupId) {
		document.getElementById(popupId).hidePopup();
  },
  showNchPopup: function(miniElem, event, popupId) {	
	  if(event.button == 0) {
//alert('otevren'+popupId);
		  document.getElementById(popupId).showPopup(miniElem,  -1, -1, 'popup', 'topright' , 'bottomright');
	  }
  },




  statusBarOnClick: function(event,what) {
    if ((event.button==0) && (this.pref.click)) {
      this.openAllTabs(what);
    }
  },

  urlOpened: function(url) {
      var found = false;
      try {
	      var b = window.getBrowser();
	      var br = b.browsers;
	      if (br == undefined) 
		      return false;
      }
      catch (e) {
		return false;
      }
      for (var i=0;i<br.length;i++) {
        var nsu = br[i].currentURI;
        if (nsu) {
          var eurl=nsu.prePath+nsu.path;
          if (eurl==url) {
          	found=b.tabContainer.childNodes[i];
          }
        }
      }
    return found;
  },

  openTab: function(url) {
      var foundTab = this.urlOpened(url);
      if (!foundTab) {
      	try {
	      	var br = window.getBrowser().browsers;
      	}
      	catch (e) {
      		var br = undefined;
      	}
		if (br != undefined) {
			window.getBrowser().selectedTab = window.getBrowser().addTab(url);
		} else {
			var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
			uri.spec = url;
			var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
			protocolSvc.loadUrl(uri);
		}       	    	
      }
      else {
      	window.getBrowser().selectedTab = foundTab;        
      }
  },

  goToUrl:function(event, url) {
  	window.getBrowser().selectedTab = window.getBrowser().addTab(url);
  },

  getCorrectBundleString: function(num,part_bundle_id,fake_num) {
    if (part_bundle_id=="") {
      return (fake_num) ? fake_num : "  "+num+"  ";
    }
    else {
    if (num==1) {
      return this.bundle.getFormattedString(part_bundle_id+"1",[(fake_num) ? fake_num : num])
    }
    else if ((num>=2) && (num<=4)) {
      return this.bundle.getFormattedString(part_bundle_id+"2to4",[(fake_num) ? fake_num : num])
    }
    else if (num>=5) {
      return this.bundle.getFormattedString(part_bundle_id+"5more",[(fake_num) ? fake_num : num])
    }
    else {
      return "";
    }
    }
  },


  enumerateStatus: function(problems) {

	var paket = new NCHPaket(this.pref.show_window_column_information,this.pref.show_window_column_alias,this.pref.show_window_column_flags);

    var newProblems={};
    for(var i=0;i<problems.length;i++) {
		paket.addTooltipHeader('all',this._servers[i].name,i,problems[i]["_time"]);
        if (problems[i]["_error"]) {
			paket.addError('all');
        }

        var st = null;
		var isNotUp = {};
		var isAck = {};
		    var isSched = {};

		for(var x=0;x<this.pt.length;x++) {
		
			var probls = (problems[i]["_error"]) ? null : problems[i][this.pt[x]];

			if (((probls) && (probls.length)) || (!probls)){
				paket.addTooltipHeader(this.pt[x],this._servers[i].name,i);
			}		  	

			if (!probls) {
				paket.addError(this.pt[x]);
			}
			else {
				st=this.pt[x];

				for (var j =0;j<probls.length;j++) {
			    
					if (
						 (!this.filterOutAll[st])
					    &&
						 ((!probls[j].acknowledged) || ((probls[j].acknowledged) && (!this.pref.filter_out_acknowledged))) 
					    &&
					    ((!probls[j].dischecks) || ((probls[j].dischecks) && (!this.pref.filter_out_disabled_checks))) 
					    &&
					    ((!probls[j].disnotifs) || ((probls[j].disnotifs) && (!this.pref.filter_out_disabled_notifications)))
					    &&
					    ((!this.pref.filter_out_downtime) || ((this.pref.filter_out_downtime) && 
					            (
					    		((!probls[j].service) && (!probls[j].downtime))
				    			|| 
					    		((probls[j].service) && (!probls[j].downtime) && (!isSched[probls[j].host]))
					    		)))

					    &&
					    ((!probls[j].flapping) || ((probls[j].flapping) && (!this.pref.filter_out_flapping)))
    			    	 &&
		    			 ((!probls[j].isSoft) || ((probls[j].isSoft) && ((!this.pref.filter_out_soft_states) || (isNotUp[probls[j].host]))))
					    &&
					    ((!this.pref.filter_out_services_on_down_hosts) || ((this.pref.filter_out_services_on_down_hosts) && ((!probls[j].service) || ((probls[j].service) && (!isNotUp[probls[j].host])))))
					    &&
					    ((!this.pref.filter_out_services_on_acknowledged_hosts) || ((this.pref.filter_out_services_on_acknowledged_hosts) && ((!probls[j].service) || ((probls[j].service) && (!isAck[probls[j].host])))))
					    &&
					    ((!this.pref.filter_out_regexp_hosts) || ((this.pref.filter_out_regexp_hosts) && (probls[j].host) &&  (((!this.pref.filter_out_regexp_hosts_reverse) && (!probls[j].host.match(new RegExp(this.pref.filter_out_regexp_hosts_value)))) || ((this.pref.filter_out_regexp_hosts_reverse) && (probls[j].host.match(new RegExp(this.pref.filter_out_regexp_hosts_value)))))))
					    &&
					    ((!this.pref.filter_out_regexp_services) || ((this.pref.filter_out_regexp_services) && (probls[j].service) && (((!this.pref.filter_out_regexp_services_reverse) && (!probls[j].service.match(new RegExp(this.pref.filter_out_regexp_services_value)))) || ((this.pref.filter_out_regexp_services_reverse) && (probls[j].service.match(new RegExp(this.pref.filter_out_regexp_services_value)))))))
					    ) {
							var uniq = this._servers[i].name+"-"+probls[j].host+"-"+probls[j].service+"-"+probls[j].status;
							newProblems[uniq]=probls[j];
							paket.addProblem(i,this.pt[x],this.oldProblems[uniq],probls[j],this._servers[i].aliases[probls[j].host]);
				    }
					if ((this.pt[x]=="down") || (this.pt[x]=="unreachable")) {
						isNotUp[probls[j].host]=true;
					    if (probls[j].acknowledged) {
						    isAck[probls[j].host]=true;
					    }
				    }
			    }
			}
          


		    }
    }

    this.oldProblems=newProblems;
    this.results = paket;

  },


  resetBehavior: function(isAny) {
    var fld = {
              "down":document.getElementById('nagioschecker-hosts-down'),
            	"unreachable": document.getElementById('nagioschecker-hosts-unreachable'),
  	          "unknown": document.getElementById('nagioschecker-services-unknown'),
  	          "warning": document.getElementById('nagioschecker-services-warning'),
  	          "critical": document.getElementById('nagioschecker-services-critical')
              };
    if (gMini) {
		this.adjustSize(null,true);
    }

    var mainPanel=document.getElementById('nagioschecker-panel');

    switch (this.pref.click) {
		  case 1:
			  mainPanel.setAttribute("onclick","nagioschecker.statusBarOnClick(event,'main');");
			  break;
		  case 3:
			if (!this.isStopped) {
//			  	mainPanel.setAttribute("onclick","nagioschecker.showNchPopup(this,event,'nagioschecker-popup');");
			}
			else {
			  	mainPanel.setAttribute("onclick","void(0);");
			}
			  break;
		  default:
			  	mainPanel.setAttribute("onclick","void(0);");
			  break;		
	  }
	  if (this.pref.click>0) {
		mainPanel.setAttribute("style","cursor:pointer");
    	for (var pType in fld) {
	      fld[pType].setAttribute("style","cursor:pointer");
	    }
	  }

	  if (this.pref.click==2){
	      for (var pType in fld) {
	        fld[pType].setAttribute("style","cursor:pointer");
	      }
	  	  fld["down"].setAttribute("onclick","nagioschecker.statusBarOnClick(event,'hosts');");
	  	  fld["unreachable"].setAttribute("onclick","nagioschecker.statusBarOnClick(event,'hosts');");
	  	  fld["unknown"].setAttribute("onclick","nagioschecker.statusBarOnClick(event,'services');");
	  	  fld["warning"].setAttribute("onclick","nagioschecker.statusBarOnClick(event,'services');");
	  	  fld["critical"].setAttribute("onclick","nagioschecker.statusBarOnClick(event,'services');");
	  }
	  else {
	      if ((this.pref.click==4) && (!this.isStopped)) {
	        for (var pType in fld) {
	          fld[pType].setAttribute("style","cursor:pointer");
	    	    fld[pType].setAttribute("onclick","nagioschecker.showNchPopup(this,event,'nagioschecker-popup-"+pType+"');");
	        }
	      }
	      else {
	        for (var pType in fld) {
			  	fld[pType].setAttribute("onclick","void(0);");
	        }
	      }
	  }

    this.resetTooltips(isAny);

  },

  resetTooltips: function(isAny) {
    var fld = {
              "down":document.getElementById('nagioschecker-hosts-down'),
            	"unreachable": document.getElementById('nagioschecker-hosts-unreachable'),
  	          "unknown": document.getElementById('nagioschecker-services-unknown'),
  	          "warning": document.getElementById('nagioschecker-services-warning'),
  	          "critical": document.getElementById('nagioschecker-services-critical')
              };
    var mainPanel=document.getElementById('nagioschecker-panel');
    var mainPopup=document.getElementById('nagioschecker-popup');

//	document.getElementById('nagioschecker-services-critical').addEventListener('mouseover',nagioschecker.handleMouseOver,false);
//	document.getElementById('nagioschecker-services-critical').addEventListener('mouseout',nagioschecker.handleMouseOut,false);
	mainPopup.addEventListener('mouseover',nagioschecker.handleMouseOver,true);
	mainPopup.addEventListener('mouseout',nagioschecker.handleMouseOut,true);

	  mainPanel.removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
	  mainPanel.removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
      for (var pType in fld) {
		  var pop = document.getElementById('nagioschecker-popup-'+pType);
		  pop.addEventListener('mouseover',nagioschecker.handleMouseOver,false);
		  pop.addEventListener('mouseout',nagioschecker.handleMouseOut,false);
		  fld[pType].removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
		  fld[pType].removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
      }

//		  mainPanel.addEventListener('mouseover',nagioschecker.handleMouseOver,false);
//		  mainPanel.addEventListener('mouseout',nagioschecker.handleMouseOut,false);

dump('RESETOOLTIPS '+isAny+' '+this.pref.info_window_type+' '+this.isStopped+'\n');
    if ((isAny) && (this.pref.info_window_type>0) && (!this.isStopped)) {
      if (this.pref.info_window_type==1) {
//        mainPanel.setAttribute("tooltip", "nagioschecker-tooltip");
dump('IWT:1\n');
		  mainPanel.addEventListener('mouseover',nagioschecker.handleMouseOver,false);
		  mainPanel.addEventListener('mouseout',nagioschecker.handleMouseOut,false);
		  mainPanel.relatedPopup='nagioschecker-popup';
//        for (var pType in fld) {
//          fld[pType].removeAttribute("tooltip");
//		  fld[pType].removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
//		  fld[pType].removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
//        } 
      }
      else {
dump('IWT:<>1\n');
//  		  mainPanel.removeAttribute("tooltip");
//		  mainPanel.removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
//		  mainPanel.removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
  		  
        for (var pType in fld) {
		  fld[pType].addEventListener('mouseover',nagioschecker.handleMouseOver,false);
		  fld[pType].addEventListener('mouseout',nagioschecker.handleMouseOut,false);
		  fld[pType].relatedTarget='nagioschecker-popup-'+pType;
//         fld[pType].setAttribute("tooltip", "nagioschecker-tooltip-"+pType);
        }
      }
    }
    else {
//  	  mainPanel.removeAttribute("tooltip");
//		  mainPanel.removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
//		  mainPanel.removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
//      for (var pType in fld) {
//        fld[pType].removeAttribute("tooltip");
//		  fld[pType].removeEventListener('mouseover',nagioschecker.handleMouseOver,false);
//		  fld[pType].removeEventListener('mouseout',nagioschecker.handleMouseOut,false);
//      }
    }
  },


  updateStatus: function(paket,firstRun) {
	this._paket=paket;

	paket.createTooltip();


	this.resetBehavior(paket.isAtLeastOne());

    var fld = {
              "down":document.getElementById('nagioschecker-hosts-down'),
	           	"unreachable": document.getElementById('nagioschecker-hosts-unreachable'),
  	          "unknown": document.getElementById('nagioschecker-services-unknown'),
  	          "warning": document.getElementById('nagioschecker-services-warning'),
  	          "critical": document.getElementById('nagioschecker-services-critical')
              };

    var infoTypes = {
          "down":["fullAlertDown","shortAlertDown",""],
          "unreachable":["fullAlertUnreachable","shortAlertUnreachable",""],
          "unknown":["fullAlertUnknown","shortAlertUnknown",""],
          "warning":["fullAlertWarning","shortAlertWarning",""],
          "critical":["fullAlertCritical","shortAlertCritical",""]
          };
    if (this.pref.info_type>2) {
      for (var pType in fld) {
        var x = "";
        var pbt = paket.getProblemsByType(pType);
        for (var i = 0; i < pbt.length; i++) {
          if (pbt[i]>0) {
              x+=((x) ? " + " : "")+((this.pref.info_type<5) ? this._servers[i].name+' ' : '')+pbt[i];
          }
        }
    	  fld[pType].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType(pType),infoTypes[pType][(this.infoType==3) ? 1 : 2],x));
      }

    }
    else {
    	fld["down"].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType("down"),infoTypes["down"][this.pref.info_type],""));
  	  fld["unreachable"].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType("unreachable"),infoTypes["unreachable"][this.pref.info_type],""));
		  fld["unknown"].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType("unknown"),infoTypes["unknown"][this.pref.info_type],""));
		  fld["warning"].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType("warning"),infoTypes["warning"][this.pref.info_type],""));
		  fld["critical"].setAttribute("value", this.getCorrectBundleString(paket.countProblemsByType("critical"),infoTypes["critical"][this.pref.info_type],""));
    }

    fld["down"].setAttribute("hidden", (((paket.countProblemsByType("down")==0) || (!this.showSb["down"])) ? "true" : "false"));
    fld["unreachable"].setAttribute("hidden", (((paket.countProblemsByType("unreachable")==0) || (!this.showSb["unreachable"])) ? "true" : "false"));
    fld["unknown"].setAttribute("hidden", (((paket.countProblemsByType("unknown")==0) || (!this.showSb["unknown"])) ? "true" : "false"));
    fld["warning"].setAttribute("hidden", (((paket.countProblemsByType("warning")==0) || (!this.showSb["warning"])) ? "true" : "false"));
    fld["critical"].setAttribute("hidden", (((paket.countProblemsByType("critical")==0) || (!this.showSb["critical"])) ? "true" : "false"));

    document.getElementById('nagioschecker-info-label').setAttribute("hidden", "true");

    this.setLoading(false);


    if (paket.countProblemsByType("all")>0) {

      var whichBlink = {};      

      for (var pType in fld) {
        whichBlink[pType]=((paket.countOldProblemsByType(pType)>0) || (this.pref.blinking==2)) ? true : false;
      }

      if ((this.pref.blinking==3) || (this.pref.blinking==2) || ((this.pref.blinking==1) && (paket.countOldProblemsByType("all")>0)) && (!firstRun)){
        this.blinkLabel(12,whichBlink);
      }
    }
    else {
      if (paket.isError) {
        this.setNoData("error");
      }
      else {
        this.setNoData("noProblem");
      }
    }
    
    if (gMini) {
      this.adjustSize(null,false);  
//		sizeToContent();
    }
    
    
  },


 blinkLabel: function(numberofblinks,bl) {
  try {
		var labelIds = [
			["nagioschecker-hosts-down","nagioschecker-down-value","nagioschecker-down-value-inverted","down"],
			["nagioschecker-hosts-unreachable","nagioschecker-unreachable-value","nagioschecker-unreachable-value-inverted","unreachable"],
			["nagioschecker-services-unknown","nagioschecker-unknown-value","nagioschecker-unknown-value-inverted","unknown"],
			["nagioschecker-services-critical","nagioschecker-critical-value","nagioschecker-critical-value-inverted","critical"],
			["nagioschecker-services-warning","nagioschecker-warning-value","nagioschecker-warning-value-inverted","warning"]
			];
	  if (numberofblinks > 0) {
		for(var i=0;i<labelIds.length;i++) {	

      if (bl[labelIds[i][3]]) {
  		  var label = document.getElementById(labelIds[i][0]);
	     label.setAttribute("class",(label.getAttribute("class") == labelIds[i][1]) ? labelIds[i][2] : labelIds[i][1]);
      }

		}
      numberofblinks--;
      var me=this;
      setTimeout(function() {
          me.blinkLabel(numberofblinks,bl);
          }, 300);
	  }
	  else {
		for(var i=0;i<labelIds.length;i++) {	
		  var label = document.getElementById(labelIds[i][0]);
	      label.setAttribute("class",labelIds[i][1]);
		}
     }
  }
  catch (e) {
    dump(e);
  }
  },



 playSound: function(paket) {
	var wav = null;
	if (paket.countProblemsByType("down")>0) {
		wav = this.pref.sound_down_path;
	}
	else if (paket.countProblemsByType("critical")>0) {
		wav = this.pref.sound_critical_path;
	}
	else if (paket.countProblemsByType("warning")>0) {
		wav = this.pref.sound_warning_path;
	}
	if (wav!=null) {
    try {
      var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
          var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var soundUri = ioService.newURI(wav, null, null);
      sound.play(soundUri);
    }
    catch(e) {
		dump(e);
    }
	}
  },

 setNoData: function(type) {
  this.setLoading(false);
 	document.getElementById('nagioschecker-hosts-down').setAttribute("hidden", "true");
 	document.getElementById('nagioschecker-hosts-unreachable').setAttribute("hidden", "true");
 	document.getElementById('nagioschecker-services-unknown').setAttribute("hidden", "true");
 	document.getElementById('nagioschecker-services-warning').setAttribute("hidden", "true");
 	document.getElementById('nagioschecker-services-critical').setAttribute("hidden", "true");

  if (type) {
    var infoLabel = document.getElementById('nagioschecker-info-label');
    infoLabel.setAttribute("hidden", "false");
    if (type=="noProblem") {
      infoLabel.setAttribute("class", "nagioschecker-allok-value");
      infoLabel.removeAttribute("tooltip");
      
      var ico = document.getElementById('nagioschecker-img');
      ico.removeAttribute("tooltip");

    var mainPanel=document.getElementById('nagioschecker-panel');
    mainPanel.removeAttribute("onclick");

		 if ((this.pref.info_type==2) || (this.pref.info_type==5)) {
	    infoLabel.setAttribute("value"," 0 ");
		 }
		 else {
	    infoLabel.setAttribute("value",nagioschecker.bundle.getString(type));
		 }
    }
	 else {
	    infoLabel.setAttribute("value",(type) ? nagioschecker.bundle.getString(type) : "");
	 }
  }
 },

  setLoading: function(loading) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if (win.nagioschecker) {
			win.nagioschecker.setIcon((loading) ? "loading" : ((win.nagioschecker.isStopped) ? "stop" : "nagios"));
			win.nagioschecker.resetBehavior(true);
      }
    }
  },

  setIcon: function(type) {
    var ico = document.getElementById('nagioschecker-img');
	switch (type) {
		case "loading":
			ico.setAttribute("src","chrome://nagioschecker/skin/Throbber.gif");
		    ico.removeAttribute("tooltiptext");
			break;
		case "nagios":
			ico.setAttribute("src","chrome://nagioschecker/skin/nagios16.png");
		    ico.removeAttribute("tooltiptext");
			break;
		case "sleepy":
			ico.setAttribute("src","chrome://nagioschecker/skin/nagiosZzz.png");
		    ico.removeAttribute("tooltiptext");
			break;
		case "disabled":
			ico.setAttribute("src","chrome://nagioschecker/skin/nag-disabled.png");
		    ico.setAttribute("tooltiptext",nagioschecker.bundle.getString("disabledRun"));
			break;
		case "stop":
			ico.setAttribute("src","chrome://nagioschecker/skin/nag-stop.png");
		    ico.setAttribute("tooltiptext",nagioschecker.bundle.getString("stoppedRun"));
			break;
	}


  },

  // retrive actual time and workingtime then calculate whether or not check Nagios status
  // sets sleepy icon
  isCheckingTime: function() {
	var bRet = false;
	var now = (new Date()).getTime() / 1000; // actual tim in sec
	now = now - (new Date()).getTimezoneOffset()*60; // TZ offset
	now = Math.round(now % 86400); // atual hour in sec (without date information)

	if (this.worktime_from > this.worktime_to) {
		this.worktime_from -= 24*60*60;
	}

	bRet = (now > this.worktime_from) && (now < this.worktime_to);
	return bRet;
  },
  
	loadPref: function(branch,conf) {
		var result = {};
		for (var i in conf) {
			try {
				switch (conf[i][0]) {
					case 'int':
						result[i] = this.preferences.getIntPref(branch+i);
						break;
					case 'bool':
						result[i] = this.preferences.getBoolPref(branch+i);
						break;
					case 'char':
						result[i] = this.preferences.getCharPref(branch+i);
						if ((result[i]=='') && (conf[i][1]!='')) {
							result[i]=conf[i][1];
						}
						break;
				}
	      }
	      catch(e) {
				result[i] = conf[i][1];
	      }
		}
		return result;
	},

_view2: {
    rowCount : 10000,
    getCellText : function(row,column){
      if (column.id == "hostCol") return "Row "+row;
      else return "February 18";
    },
    setTree: function(treebox){ this.treebox = treebox; },
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
},


  _view: {
    _rowCount: 0,
    get rowCount() { 
      return this._rowCount; 
    },
    getCellText: function (aRow, aColumn) {
      var aCol = typeof(aColumn)=="object" ? aColumn.id : aColumn;
dump(aRow+":"+aColumn+"\n");
dump(nagioschecker._paket.ttip[aRow]['type']);
	  switch (nagioschecker._paket.ttip[aRow]['type']) {
	  	case 'header':

	      switch( aCol ) {
	        case "hostCol":
	          return (nagioschecker._paket.ttip[aRow]['data']) ? "" : nagioschecker._paket.ttip[aRow]['data'];
			default:
			  return "";
	      }

	  	break;
	  	case 'problem':

		      switch( aCol ) {
		        case "hostCol":
		          return (nagioschecker._paket.ttip[aRow].data.host==null) ? "" : nagioschecker._paket.ttip[aRow].data.host;
		        case "newCol":
		          return "?";
		        case "statusCol":
		          return (nagioschecker._paket.ttip[aRow].data.status==null) ? "" : nagioschecker._paket.ttip[aRow].data.status;
		        case "flagsCol":
		          return (nagioschecker._paket.ttip[aRow].data.status==null) ? "" : nagioschecker._paket.ttip[aRow].data.status;
		        case "durationCol":
		          return (nagioschecker._paket.ttip[aRow].data.duration==null) ? "" : nagioschecker._paket.ttip[aRow].data.duration;
		        case "infoCol":
		          return (nagioschecker._paket.ttip[aRow].data.info==null) ? "" : nagioschecker._paket.ttip[aRow].data.info;
		        default:
		          return null;
		      }

	  	break;
	  }

    },
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isContainer: function(aIndex) { return false; },
	setTree: function(treebox){ this.treebox = treebox; },
	getImageSrc: function(aRow, aColumn) {},
    getProgressMode: function(aRow, aColumn) {},
//    getCellValue: function(aRow, aColumn) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(aRow, aProperty) {
    },
    getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
    getCellProperties: function(aRow, aCol,aProperty) {
/*    
		if (gNCHOptions._servers[aRow].disabled) {
			var aserv=Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
			aProperty.AppendElement(aserv.getAtom("disServer"));
		}
*/    
    
    }
  }



}


function NCHToolTip(showColInfo,showColAlias,showColFlags) {
  this._rows=null;
  this.title=title;
  this._vbox=null;
  this.headers = [];
  this.showColInfo=showColInfo;
  this.showColAlias=showColAlias;
  this.showColFlags=showColFlags;
	this.actH=-1;
	
  this._table = null;	
  this._tableContent = null;
  this._groupEl = [];


	
  this.create = function(from) {
    this._tooltip=from;

    var doc=document;
/*
    while (this._tooltip.childNodes.length > 0) this._tooltip.removeChild(this._tooltip.childNodes[0]);
    this._tooltip.removeAttribute("title");
    this._tooltip.removeAttribute("label");
*/
    if (doc) {

    var ph=window.screen.height-300;
    ph=(ph<500) ? 500 : ph;
	this._tooltip.setAttribute("maxheight",ph+"px");
    var pw=window.screen.width-300;
    pw=(pw<500) ? 500 : pw;
	this._tooltip.setAttribute("minwidth",ph+"px");
	this._tooltip.setAttribute("maxwidth",(window.screen.width-300)+"px");
/*
	this._table = doc.createElement("tree");
	this._table.setAttribute("id","results-"+this._tooltip.id);
//	this._table.setAttribute("rows",10);
//	this._table.setAttribute("hidecolumnpicker","true");
	this._table.setAttribute("flex","1");
//	this._table.setAttribute("class","poptree");
	var cols = doc.createElement("treecols");


	var lHost = doc.createElement("treecol");
	lHost.setAttribute("label", nagioschecker.bundle.getString("host")+"/"+nagioschecker.bundle.getString("service"));
	lHost.setAttribute("flex","2");
	lHost.setAttribute("id","hostCol");
//	lHost.setAttribute("primary","true");
	cols.appendChild(lHost);
*/ 
/*
	var lNew = doc.createElement("treecol");
	lNew.setAttribute("id","newCol");
	lNew.setAttribute("label", "");
	lNew.setAttribute("flex", "1");
	cols.appendChild(lNew);

    if (this.showColAlias) {
		var lAlias = doc.createElement("treecol");
		lAlias.setAttribute("id","aliasCol");
		lAlias.setAttribute("label", nagioschecker.bundle.getString("hostAlias"));
		lAlias.setAttribute("flex","2");
		cols.appendChild(lAlias);
	}

    if (this.showColFlags) {
 		var lFlags = doc.createElement("treecol");
		lFlags.setAttribute("id","flagsCol");
		lFlags.setAttribute("label", nagioschecker.bundle.getString("flags"));
		lFlags.setAttribute("flex","2");
		cols.appendChild(lFlags);
    }

	var lStat = doc.createElement("treecol");
	lStat.setAttribute("id","statusCol");
	lStat.setAttribute("label", nagioschecker.bundle.getString("status"));
	lStat.setAttribute("flex","2");
	cols.appendChild(lStat);

	var lTime = doc.createElement("treecol");
	lTime.setAttribute("id","durationCol");
	lTime.setAttribute("label", nagioschecker.bundle.getString("duration"));
	lTime.setAttribute("flex","2");
	cols.appendChild(lTime);

    if (this.showColInfo) {
		var lInfo = doc.createElement("treecol");
		lInfo.setAttribute("id","infoCol");
		lInfo.setAttribute("label", nagioschecker.bundle.getString("information"));
		lInfo.setAttribute("flex","3");
		cols.appendChild(lInfo);
    }
*/
/*
	this._table.appendChild(cols);

	this._tableContent = doc.createElement("treechildren");
	this._table.appendChild(this._tableContent);
	this._tooltip.appendChild(this._table);
*/

/*
	nagioschecker._super=document.getElementById('my-tree');
  		nagioschecker._super.view=treeView;
  		**/ 
		nagioschecker._view._rowCount=nagioschecker._paket.ttip.length;
  		document.getElementById('my-tree').view=nagioschecker._view;

//  		this._table.view=nagioschecker._view;
		//	nagioschecker._super.view=treeView;
 
/*
    this._vbox = doc.createElement("scrollbox");
    this._vbox.setAttribute("style","overflow: -moz-scrollbars-horizontal;");
    this._vbox.setAttribute("flex","1");
//dump ('vboxid:'+from.id+'-id');
//    this._vbox.setAttribute("id",from.id+'-id');
		var grid = doc.createElement("grid");
		this._vbox.appendChild(grid);
		var cls = doc.createElement("columns");
		grid.appendChild(cls);
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
    if (this.showColAlias) {
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
    }
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
if (this.showColFlags) {		
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
}
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cls.appendChild(cl);
    if (this.showColInfo) {
		var cl = doc.createElement("column");
//		cl.setAttribute("flex","1");
		cl.setAttribute("style","max-width:20px;");


		cls.appendChild(cl);
    }
		this._rows = doc.createElement("rows");
		grid.appendChild(this._rows);

		var row = doc.createElement("row");
		this._rows.appendChild(row);

		var lNew = doc.createElement("label");
		lNew.setAttribute("value", "");
		
		row.appendChild(lNew);

		var lHost = doc.createElement("label");
		lHost.setAttribute("value", nagioschecker.bundle.getString("host"));
		row.appendChild(lHost);

    if (this.showColAlias) {
		var lAlias = doc.createElement("label");
		lAlias.setAttribute("value", nagioschecker.bundle.getString("hostAlias"));
//		lAlias.setAttribute("maxwidth", "50px");
		row.appendChild(lAlias);
	}
 		var lServ = doc.createElement("label");
	  lServ.setAttribute("value", nagioschecker.bundle.getString("service"));
	  row.appendChild(lServ);

    if (this.showColFlags) {
 		var lFlags = doc.createElement("label");
	  lFlags.setAttribute("value", nagioschecker.bundle.getString("flags"));
	  row.appendChild(lFlags);
    }
		var lStat = doc.createElement("label");
		lStat.setAttribute("value", nagioschecker.bundle.getString("status"));
		row.appendChild(lStat);

		var lTime = doc.createElement("label");
		lTime.setAttribute("value", nagioschecker.bundle.getString("duration"));
		row.appendChild(lTime);

    if (this.showColInfo) {
		var lInfo = doc.createElement("label");
		lInfo.setAttribute("value", nagioschecker.bundle.getString("information"));
		row.appendChild(lInfo);
    }

*/
/*	
    this._view._rowCount = this._servers.length;
    this._tree.treeBoxObject.view = this._view;
*/

/*
	dump("TTIPLEN:"+nagioschecker._paket.ttip.length);
	nagioschecker._view._rowCount=nagioschecker._paket.ttip.length;
	dump("tab.id:"+this._table.id);
	dump(nagioschecker._view);
//	this._table.view=nagioschecker._view;	
	this._table.view=treeView;	
*/



/*

	 for(var i = 0;i<this.headers.length;i++) {
    	if ((this.headers[i].problems.length) || (this.headers[i].error)) {
			this.createHeader(i,this.headers[i].data,this.headers[i].time);  
        	if (!this.headers[i].error) {

	  			this.headers[i].problems.sort(function (a,b) {
					return a.durationSec-b.durationSec;				
				});
				for(var j = 0;j<this.headers[i].problems.length;j++) {
					var serPo = this.headers[i].servPos;
  			  		this.createRow(this.headers[i].problems[j],i,serPo);
        		}
        	}
        	else {
         	this.createError();
        	}
      }
    }
*/



/*    
		var wi = doc.createElement("window");
		wi.setAttributeNS("xmlns","html","http://www.w3.org/1999/xhtml");
		wi.setAttribute("width","500");
		wi.setAttribute("height","500");
		
		var h1 = doc.createElementNS("html","div");
		h1.appendChild(doc.createTextNode("Pokus"));
		wi.appendChild(h1);

		this._tooltip.appendChild(wi);
*/

/*
		this._tooltip.appendChild(this._vbox);

*/		
//    this._tooltip.setAttribute("style","max-height:"+ph+"px;");
     
	  }



  }
  this.createHeader= function(pos,name,time) {

    var doc=document;

    if (doc) {

		var titem = document.createElement("treeitem");
		this._tableContent.appendChild(titem);
		var row = document.createElement("treerow");
  		row.setAttribute("properties", "group");
		titem.appendChild(row);
		var tcell = doc.createElement("treecell");
		tcell.setAttribute("label",name);
  		tcell.setAttribute("properties", "group");
		row.appendChild(tcell);

/*
		var head = doc.createElement("treeitem");
		head.setAttribute("container","true");
		head.setAttribute("open","true");
		this._tableContent.appendChild(head);
		var trow = doc.createElement("treerow");
  		trow.setAttribute("properties", "group");
		head.appendChild(trow);
		var tcell = doc.createElement("treecell");
		tcell.setAttribute("label",name);
  		tcell.setAttribute("properties", "group");
		trow.appendChild(tcell);
		this._groupEl[pos] = doc.createElement("treechildren");
		head.appendChild(this._groupEl[pos]);
*/ 
		
/*
		var separator = doc.createElement("separator");
		separator.setAttribute("class", "groove-thin");
		this._rows.appendChild(separator);

    var hbd = doc.createElement("hbox");
		this._rows.appendChild(hbd);

    var description = doc.createElement("description");
		description.setAttribute("class", "nagioschecker-tooltip-title");
		description.setAttribute("value",name);
		hbd.appendChild(description);
    var sp = doc.createElement("spacer");
		sp.setAttribute("flex", "1");
		hbd.appendChild(sp);
    var description2 = doc.createElement("description");
		description2.setAttribute("class", "nagioschecker-tooltip-title-date");
		description2.setAttribute("value",(time!=null) ? time.toLocaleString() : "");
		hbd.appendChild(description2);

		var separator = doc.createElement("separator");
		separator.setAttribute("class", "groove-thin");
		this._rows.appendChild(separator);
*/ 
    }

  }
  this.createError= function() {

    var doc=document;
/*
		var row = document.createElement("row");
 		this._rows.appendChild(row);
		var lErr = document.createElement("label");
		lErr.setAttribute("class","error");
		lErr.setAttribute("value", nagioschecker.bundle.getString("downloadError"));
		row.appendChild(lErr);
*/


  }
  this.addHeader= function(name,serPo,timeFetch) {
		this.headers[++this.actH]={data:name,error:false,problems:[],aliases:{},news:{},servPos:serPo,time:timeFetch};
	}
  this.addError= function() {
		this.headers[this.actH].error=true;
	}
  this.addRow = function(problem,alias,isNew) {
		this.headers[this.actH].problems.push(problem);

		this.headers[this.actH].aliases[problem.host]=alias;
		this.headers[this.actH].news[problem.host]=isNew;
	}


  
  this.createRow = function(problem,i,serPo) {

	var titem = document.createElement("treeitem");
	this._tableContent.appendChild(titem);
	var row = document.createElement("treerow");
	titem.appendChild(row);

    var status_text = "";
    var prop = "";
    switch (problem.status) {
      case "down":
//    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-down-row");
        status_text = nagioschecker.bundle.getString("alertDown1")
        break;
      case "unreachable":
//    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-unreachable-row");
        status_text = nagioschecker.bundle.getString("alertUnreachable1")
        break;
      case "unknown":
//    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-unknown-row");
        status_text = nagioschecker.bundle.getString("alertUnknown1")
        break;
      case "warning":
//    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-warning-row");
        status_text = nagioschecker.bundle.getString("alertWarning1")
        break;
      case "critical":
//    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-critical-row");
        status_text = nagioschecker.bundle.getString("alertCritical1")
        break;
    }
 	row.setAttribute("properties", problem.status);
 	row.setAttribute("class", problem.status+"-class");



	var lHost = document.createElement("treecell");
	lHost.setAttribute("label", problem.host+((problem.service==null) ? "" : problem.service));
 	lHost.setAttribute("properties", problem.status);
	row.appendChild(lHost);

	var lNew = document.createElement("treecell");
 	lNew.setAttribute("properties", problem.status);
    if (this.headers[i].news[problem.host]) {
		  lNew.setAttribute("label", " ! ");
		  lNew.setAttribute("tooltiptext", nagioschecker.bundle.getString("new"));
//		  lNew.setAttribute("style", "font-weight:bold;");
    }
    else {
		lNew.setAttribute("label", "");
    }
	row.appendChild(lNew);

    if (this.showColAlias) {
		var lAlias = document.createElement("treecell");
		lAlias.setAttribute("label", (this.headers[i].aliases[problem.host]) ? this.headers[i].aliases[problem.host] : "-");
	 	lAlias.setAttribute("properties", problem.status);
		row.appendChild(lAlias);
	}


	var flags="";
	if (problem.acknowledged) flags+='Ac';
	if (problem.dischecks) flags+='Ch';
	if (problem.disnotifs) flags+='Nt';
	if (problem.downtime) flags+='Dw';
	if (problem.flapping) flags+='Fl';
	if (problem.onlypass) flags+='Pa';

    if (this.showColFlags) {
		var lFlags = document.createElement("treecell");
		lFlags.setAttribute("label", flags);
	 	lFlags.setAttribute("properties", problem.status);
		row.appendChild(lFlags);
    }



	var lStat = document.createElement("treecell");
	lStat.setAttribute("label", status_text);
 	lStat.setAttribute("properties", problem.status);
	row.appendChild(lStat);

	var lTime = document.createElement("treecell");
	lTime.setAttribute("label", problem.duration);
 	lTime.setAttribute("properties", problem.status);
	row.appendChild(lTime);


    if (this.showColInfo) {
		var lInfo = document.createElement("treecell");
		lInfo.setAttribute("label", problem.info);
	 	lInfo.setAttribute("properties", problem.status);
		row.appendChild(lInfo);
    }
		
		
/*
	var row = document.createElement("row");
		
    var status_text = "";
    switch (problem.status) {
      case "down":
    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-down-row");
        status_text = nagioschecker.bundle.getString("alertDown1")
        break;
      case "unreachable":
    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-unreachable-row");
        status_text = nagioschecker.bundle.getString("alertUnreachable1")
        break;
      case "unknown":
    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-unknown-row");
        status_text = nagioschecker.bundle.getString("alertUnknown1")
        break;
      case "warning":
    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-warning-row");
        status_text = nagioschecker.bundle.getString("alertWarning1")
        break;
      case "critical":
    		row.setAttribute("class", "nagioschecker-tooltip-row nagioschecker-tooltip-critical-row");
        status_text = nagioschecker.bundle.getString("alertCritical1")
        break;
    }

		row.setAttribute("onclick","nagioschecker.hideNchPopup('"+this._tooltip.id+"');nagioschecker.openTab(nagioschecker.createUrlDevice('"+serPo+"','"+problem.host+"',"+((problem.service) ? "'"+problem.service+"'" : "null")+"))");

 		this._rows.appendChild(row);


		var lNew = document.createElement("label");
    if (this.headers[i].news[problem.host]) {
		  lNew.setAttribute("value", " ! ");
		  lNew.setAttribute("tooltiptext", nagioschecker.bundle.getString("new"));
		  lNew.setAttribute("style", "font-weight:bold;");
    }
    else {
		lNew.setAttribute("value", "");
    }
		row.appendChild(lNew);


		var lHost = document.createElement("label");
		lHost.setAttribute("value", problem.host);


		row.appendChild(lHost);



    if (this.showColAlias) {
		var lAlias = document.createElement("label");

		lAlias.setAttribute("value", (this.headers[i].aliases[problem.host]) ? this.headers[i].aliases[problem.host] : "-");
			row.appendChild(lAlias);
	}
		var lServ = document.createElement("label");
		lServ.setAttribute("value", (problem.service==null) ? "-" : problem.service);
		row.appendChild(lServ);

		var flags="";
		if (problem.acknowledged) flags+='Ac';
		if (problem.dischecks) flags+='Ch';
		if (problem.disnotifs) flags+='Nt';
		if (problem.downtime) flags+='Dw';
		if (problem.flapping) flags+='Fl';
		if (problem.onlypass) flags+='Pa';

    if (this.showColFlags) {
		var lFlags = document.createElement("label");
		lFlags.setAttribute("value", flags);
		row.appendChild(lFlags);
    }

		var lStat = document.createElement("label");
		lStat.setAttribute("value", status_text);
		row.appendChild(lStat);

		var lTime = document.createElement("label");
		lTime.setAttribute("value", problem.duration);
		row.appendChild(lTime);


    if (this.showColInfo) {
		var lInfo = document.createElement("label");
		lInfo.setAttribute("value", problem.info);
		lInfo.setAttribute("style","overflow:hidden;white-space:nowrap;");
		row.appendChild(lInfo);
    }


*/


  }


}

function NCHPaket(sci,sca,scf) {
	this.showColInfo = sci;
	this.showColAlias = sca;
	this.showColFlags = scf;
	this.pt = ["down","unreachable","unknown","warning","critical"];
	this.ttip = [];
	this.all = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.down = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.unreachable = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.unknown = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.warning = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.critical = [new NCHToolTip(this.showColInfo,this.showColAlias,this.showColFlags),0,0,[],[]];
	this.isError = false;
	this.addTooltipHeader = function(to,header,serverPos,timeFetch) {
		this.ttip.push({type:'header',data:header});
	 	this[to][0].addHeader(header,serverPos,timeFetch);
	}
	this.addError = function(to) {
		this[to][0].addError();
		this["isError"]=true;
	}
	this.addProblem = function(serverPos,problemType,isOld,problem,aliasName) {
		if (!isOld) {
			this["all"][2] = (this["all"][2]) ? this["all"][2]+1 : 1;
			this["all"][4][serverPos] = (this["all"][4][serverPos]) ? this["all"][4][serverPos]+1 : 1;
			this[problemType][2] = (this[problemType][2]) ? this[problemType][2]+1 : 1;
			this[problemType][4][serverPos] = (this[problemType][4][serverPos]) ? this[problemType][4][serverPos]+1 : 1;
		}
		this.ttip.push({type:'problem',data:problem});
		this[problemType][1] = (this[problemType][1]) ? this[problemType][1]+1 : 1;
		this[problemType][3][serverPos] = (this[problemType][3][serverPos]) ? this[problemType][3][serverPos]+1 : 1;
		this["all"][0].addRow(problem,aliasName,(!isOld));
		this[problemType][0].addRow(problem,aliasName,(!isOld));
		this["all"][1] = (this["all"][1]) ? this["all"][1]+1 : 1;
		this["all"][3][serverPos] = (this["all"][3][serverPos]) ? this["all"][3][serverPos]+1 : 1;
	}
	this.getProblemsByType = function(problemType) {
	 	return this[problemType][3];
	}
	this.countProblemsByType = function(problemType) {
 		return this[problemType][1];
	}
	this.countOldProblemsByType = function(problemType) {
	 	return this[problemType][2];
	}
	this.createTooltip = function() {
	    if (this["all"][0]) {
	      this["all"][0].create(document.getElementById('nagioschecker-popup'));
//		    this["all"][0].create(document.getElementById('nagioschecker-tooltip'));
	    }
/*
    	for(var i=0;i<this.pt.length;i++) {
	      if ((this[this.pt[i]]) && (this[this.pt[i]][0])) {
//	        this[this.pt[i]][0].create(document.getElementById('nagioschecker-tooltip-'+this.pt[i]));
	        this[this.pt[i]][0].create(document.getElementById('nagioschecker-popup-'+this.pt[i]));
	      }
	    }
*/ 
	}
	this.isAtLeastOne =  function() {
		return (this["all"][1]>0);
	}
}

