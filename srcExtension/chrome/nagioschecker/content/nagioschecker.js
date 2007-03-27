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
  update_interval:null,
  worktime_from:null,
  worktime_to:null,
  _servers:[],
  urlSide: "",
  urlServices: "",
  urlHosts: "",
  urlStatus:"",
  one_window_only: false,
  timeoutId: null,
  isStopped:false,
  timoutSec:30,
  sndWarning:null,
  sndCritical:null,
  sndDown:null,
  preferences: Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch),


  oldProblems:{},

  infoType:0,
  infoWindowType:0,
  showSb:{},
  showColInfo:true,
  showColAlias:false,
  play_sound: 2,
  blinking: 2,
  doubleclick: 0,
  oneclick: 0,
  filterOutAck: true,
  filterOutDisNot: false,
  filterOutDisChe: true,
  filterOutSoftStat: false,
  filterOutDowntime: false,
  filterOutServOnDown: false,
  filterOutServOnAck: false,
  filterOutREHosts: false,
  filterOutREServices: false,
  filterOutREHostsValue: "",
  filterOutREServicesValue: "",
  filterOutAll:{"down":false,"unreachable":false,"uknown":false,"warning":false,"critical":false},
  soundBT:{},
  parser: null,
  pt:["down","unreachable","unknown","warning","critical"],
  results:{},
  start : function() {
/*
    if (gMini) {
      this.adjustSize(null,true);  
    }
*/
    this.parser = new NCHParser();
    this.bundle = document.getElementById("nch-strings");
    this.setNoData(null);
    try{
      var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
      sound.init();
    }
    catch(e) {}

    this.reload(true);
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
    var firstWin = this.getFirstWindow();
    firstWin.nagioschecker.isStopped = (!firstWin.nagioschecker.isStopped);
    document.getElementById('nagioschecker-stoprun').setAttribute("label",(firstWin.nagioschecker.isStopped) ? this.bundle.getString("runagain") : this.bundle.getString("stop"));
	  this.preferences.setBoolPref("extensions.nagioschecker.stopped",firstWin.nagioschecker.isStopped);
    firstWin.nagioschecker.reload(true);
  },

  reload : function(firstRun) {

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
                  disabled:gDis,
                  });
        }
      }
    }
    catch(e) {
    }

    
    this.parser.setServers(this._servers);

    this.sndWarning="chrome://nagioschecker/content/warning.wav";
    try {
      if (this.preferences.getIntPref("extensions.nagioschecker.sound_warning")) {
        try {
          this.sndWarning = "file:///"+this.preferences.getCharPref("extensions.nagioschecker.sound_warning_path");
        }
        catch(e) { }
      }
    }
    catch(e) {}
    
    this.sndCritical="chrome://nagioschecker/content/critical.wav";
    try {
      if (this.preferences.getIntPref("extensions.nagioschecker.sound_critical")) {
        try {
          this.sndCritical = "file:///"+this.preferences.getCharPref("extensions.nagioschecker.sound_critical_path");
        }
        catch(e) { }
      }
    }
    catch(e) {}

    this.sndDown="chrome://nagioschecker/content/hostdown.wav";
    try {
      if (this.preferences.getIntPref("extensions.nagioschecker.sound_down")) {
        try {
          this.sndDown = "file:///"+this.preferences.getCharPref("extensions.nagioschecker.sound_down_path");
        }
        catch(e) { }
      }
    }
    catch(e) {}

    try {
      this.isStopped = this.preferences.getBoolPref("extensions.nagioschecker.stopped");
    }
    catch(e) {
      this.isStopped = false;
    }
    try {
      this.timeoutSec = this.preferences.getIntPref("extensions.nagioschecker.timeout");
    }
    catch(e) {
      this.timeoutSec = 30;
    }

    this.parser.setTimeout(this.timeoutSec);

    try {
      this.infoType = this.preferences.getIntPref("extensions.nagioschecker.info_type");
    }
    catch(e) {
      this.infoType = 0;
    }
    try {
      this.infoWindowType = this.preferences.getIntPref("extensions.nagioschecker.info_window_type");
    }
    catch(e) {
      this.infoWindowType = 0;
    }

    for (var i in this.pt) {
      try {
        this.showSb[this.pt[i]] = this.preferences.getBoolPref("extensions.nagioschecker.show_statusbar_"+this.pt[i]);
      }
      catch(e) {
        this.showSb[this.pt[i]]=true;
      }
      try {
        this.filterOutAll[this.pt[i]] = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_all_"+this.pt[i]);
      }
      catch(e) {
        this.filterOutAll[this.pt[i]]=false;
      }
      try {
        this.soundBT[this.pt[i]] = this.preferences.getBoolPref("extensions.nagioschecker.sounds_by_type_"+this.pt[i]);
      }
      catch(e) {
        this.soundBT[this.pt[i]]=true;
      }
    }

    try {
      this.showColInfo = this.preferences.getBoolPref("extensions.nagioschecker.show_window_column_information");
    }
    catch(e) {
      this.showColInfo=true;
    }

    try {
      this.showColAlias = this.preferences.getBoolPref("extensions.nagioschecker.show_window_column_alias");
    }
    catch(e) {
      this.showColAlias=false;
    }

    try {
      this.filterOutAck = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_acknowledged");
    }
    catch(e) {
      this.filterOutAck=true;
    }

    try {
      this.filterOutDisNot = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_disabled_notifications");
    }
    catch(e) {
      this.filterOutDisNot=true;
    }

    try {
      this.filterOutDisChe = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_disabled_checks");
    }
    catch(e) {
      this.filterOutDisChe=true;
    }
    try {
      this.filterOutSoftStat = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_soft_states");
    }
    catch(e) {
      this.filterOutSoftStat=false;
    }
    try {
      this.filterOutDowntime = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_downtime");
    }
    catch(e) {
      this.filterOutDowntime=false;
    }
    try {
      this.filterOutServOnDown = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_services_on_down_hosts");
    }
    catch(e) {
      this.filterOutServOnDown=false;
    }
    try {
      this.filterOutServOnAck = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_services_on_acknowledged_hosts");
    }
    catch(e) {
      this.filterOutServOnAck=false;
    }

    try {
      this.filterOutREHosts = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_regexp_hosts");
    }
    catch(e) {
      this.filterOutREHosts=false;
    }

    try {
      this.filterOutREServices = this.preferences.getBoolPref("extensions.nagioschecker.filter_out_regexp_services");
    }
    catch(e) {
      this.filterOutREServices=false;
    }

    try {
      this.filterOutREHostsValue = this.preferences.getCharPref("extensions.nagioschecker.filter_out_regexp_hosts_value");
    }
    catch(e) {
      this.filterOutREHostsValue="";
    }

    try {
      this.filterOutREServicesValue = this.preferences.getCharPref("extensions.nagioschecker.filter_out_regexp_services_value");
    }
    catch(e) {
      this.filterOutREServicesValue="";
    }

    try {
      this.update_interval = this.preferences.getIntPref("extensions.nagioschecker.refresh");
    }
    catch(e) {
      this.update_interval=5;
    }

    try {
      sWorktimeFrom = this.preferences.getCharPref("extensions.nagioschecker.worktimefrom");
      while (sWorktimeFrom.length < 5) { // fill up to 5 chars (08:40)
      	sWorktimeFrom = "0"+sWorktimeFrom;
      }
      this.worktime_from = ( (sWorktimeFrom.substring(0,2)*60) + (sWorktimeFrom.substring(3,5)*1) )*60;
    }
    catch(e) {
      this.worktime_from=28800; // 8:00
    }

    try {
      sWorktimeTo = this.preferences.getCharPref("extensions.nagioschecker.worktimeto");
      while (sWorktimeTo.length < 5) { // fill up to 5 chars (08:40)
      	sWorktimeTo = "0"+sWorktimeTo;
      }
      this.worktime_to = ( (sWorktimeTo.substring(0,2)*60) + (sWorktimeTo.substring(3,5)*1) )*60;
    }
    catch(e) {
      this.worktime_to=64800; // 18:00
    }

    try {
      this.play_sound = this.preferences.getIntPref("extensions.nagioschecker.play_sound");
    }
    catch(e) {
      this.play_sound=2;
    }


    try {
      this.blinking = this.preferences.getIntPref("extensions.nagioschecker.blinking");
    }
    catch(e) {
      this.blinking=2;
    }
/*
    try {
      this.doubleclick = this.preferences.getIntPref("extensions.nagioschecker.doubleclick");
    }
    catch(e) {
      this.doubleclick=0;
    }
*/
    try {
      this.oneclick = this.preferences.getIntPref("extensions.nagioschecker.click");
    }
    catch(e) {
      this.oneclick=0;
    }
    try {
      this.one_window_only = this.preferences.getBoolPref("extensions.nagioschecker.one_window_only");
    }
    catch(e) {
      this.one_window_only=false;
    }

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
        if (this.one_window_only) {
          this.setNoData("disabledData");
        }
        else {
          this.results=firstWin.nagioschecker.results;
          this.updateStatus(this.results,true);
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
		var url = extinfo+"?type="+((service) ? "2" : "1")+"&host="+host;
		if (service) {
			url+="&service="+service;
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
			, this.update_interval*60000
		);
  },

  handleProblems: function(probs) {
	if (document) {
		this.enumerateStatus(probs);
		this.updateAllClients(this.results);
		var reallyPlay=false;
		for(var i=0;i<this.pt.length;i++) {
			if ( 
				((this.play_sound==1) && (this.soundBT[this.pt[i]]) && (this.results[this.pt[i]][2]))
				||
				((this.play_sound==2) && (this.soundBT[this.pt[i]]) && (this.results[this.pt[i]][1]))
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

  updateAllClients: function(ttIndi) {
  
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    var enumerator = wm.getEnumerator("");
    var cnt=0;
    while(enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if (win.nagioschecker) {
        if (!this.isStopped) {        
          if ((this.one_window_only) && (cnt>0)) {
            win.nagioschecker.setNoData("disabledData");
          }
          else {
            if (ttIndi==null) {
              win.nagioschecker.setNoData("noProblem");
            }
            else {
              win.nagioschecker.updateStatus(ttIndi,false);
            }
          }
        }
        else {
          win.nagioschecker.setNoData("stopped");
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
    this.resetTooltips(false);
  },
  popupClosed: function() {
    this.resetTooltips(true);
  },

  hideNchPopup: function(popupId) {
		document.getElementById(popupId).hidePopup();
  },
  showNchPopup: function(miniElem, event, popupId) {	
	  if(event.button == 0) 
		  document.getElementById(popupId).showPopup(miniElem,  -1, -1, 'popup', 'topright' , 'bottomright');
  },




  statusBarOnClick: function(event,what) {
    if ((event.button==0) && (this.oneclick)) {
      this.openAllTabs(what);
    }
  },

  urlOpened: function(url) {
      found = false;
      var b = window.getBrowser();
      var br = b.browsers;
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
      	window.getBrowser().selectedTab = window.getBrowser().addTab(url);        
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
		var ttIndi={
          "all":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "down":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "unreachable":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "unknown":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "warning":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "critical":[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
          "isError":false
          };

    var newProblems={};
    for(var i=0;i<problems.length;i++) {

      ttIndi["all"][0].addHeader(this._servers[i].name,i);
        if (problems[i]["_error"]) {
         	  ttIndi["all"][0].addError();
            ttIndi["isError"]=true;
        }

        var st = null;
		    var isNotUp = {};
		    var isAck = {};

 		    for(var x=0;x<this.pt.length;x++) {
			    var probls = (problems[i]["_error"]) ? null : problems[i][this.pt[x]];

  			  if (((probls) && (probls.length)) || (!probls)){
         	  ttIndi[this.pt[x]][0].addHeader(this._servers[i].name,i);
			    }		  	

          if (!probls) {
         	  ttIndi[this.pt[x]][0].addError();
            ttIndi["isError"]=true;
          }
          else {

   						st=this.pt[x];

			    for (var j =0;j<probls.length;j++) {

//alert(this.filterOutREHostsValue+":"+probls[j].host+":"+(new RegExp(this.filterOutREHostsValue))+":"+probls[j].host.match(new RegExp("^"+this.filterOutREHostsValue)));
				    if  (
            	(!this.filterOutAll[st])
					    &&
	          	((!probls[j].acknowledged) || ((probls[j].acknowledged) && (!this.filterOutAck))) 
					    &&
					    ((!probls[j].dischecks) || ((probls[j].dischecks) && (!this.filterOutDisChe))) 
					    &&
					    ((!probls[j].disnotifs) || ((probls[j].disnotifs) && (!this.filterOutDisNot)))
					    &&
					    ((!probls[j].downtime) || ((probls[j].downtime) && (!this.filterOutDowntime)))
    			    &&
		    			((!probls[j].isSoft) || ((probls[j].isSoft) && ((!this.filterOutSoftStat) || (isNotUp[probls[j].host]))))
					    &&
					    ((!this.filterOutServOnDown) || ((this.filterOutServOnDown) && ((!probls[j].service) || ((probls[j].service) && (!isNotUp[probls[j].host])))))
					    &&
					    ((!this.filterOutServOnAck) || ((this.filterOutServOnAck) && ((!probls[j].service) || ((probls[j].service) && (!isAck[probls[j].host])))))
					    &&
					    ((!this.filterOutREHosts) || ((this.filterOutREHosts) && (!probls[j].host.match(new RegExp(this.filterOutREHostsValue)))))
					    &&
					    ((!this.filterOutREServices) || ((this.filterOutREServices) && (!probls[j].service.match(new RegExp(this.filterOutREServicesValue)))))
					    ) {

						    var uniq = this._servers[i].name+"-"+probls[j].host+"-"+probls[j].service+"-"+probls[j].status;
	            	newProblems[uniq]=probls[j];

				    		if (!this.oldProblems[uniq]) {
							    ttIndi["all"][2] = (ttIndi["all"][2]) ? ttIndi["all"][2]+1 : 1;
							    ttIndi["all"][4][i] = (ttIndi["all"][4][i]) ? ttIndi["all"][4][i]+1 : 1;
							    ttIndi[this.pt[x]][2] = (ttIndi[this.pt[x]][2]) ? ttIndi[this.pt[x]][2]+1 : 1;
							    ttIndi[this.pt[x]][4][i] = (ttIndi[this.pt[x]][4][i]) ? ttIndi[this.pt[x]][4][i]+1 : 1;
						    }
						    ttIndi[st][1] = (ttIndi[st][1]) ? ttIndi[st][1]+1 : 1;
						    ttIndi[st][3][i] = (ttIndi[st][3][i]) ? ttIndi[st][3][i]+1 : 1;
						    ttIndi["all"][0].addRow(probls[j],this._servers[i].aliases[probls[j].host],(!this.oldProblems[uniq]));
						    ttIndi[st][0].addRow(probls[j],this._servers[i].aliases[probls[j].host],(!this.oldProblems[uniq]));
						    ttIndi["all"][1] = (ttIndi["all"][1]) ? ttIndi["all"][1]+1 : 1;
						    ttIndi["all"][3][i] = (ttIndi["all"][3][i]) ? ttIndi["all"][3][i]+1 : 1;
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
    this.results=ttIndi;

  },


  resetBehavior: function(isAny) {
    var fld = {
              "down":document.getElementById('nagioschecker-hosts-down'),
            	"unreachable": document.getElementById('nagioschecker-hosts-unreachable'),
  	          "unknown": document.getElementById('nagioschecker-services-unknown'),
  	          "warning": document.getElementById('nagioschecker-services-warning'),
  	          "critical": document.getElementById('nagioschecker-services-critical')
              };

    var mainPanel=document.getElementById('nagioschecker-panel');

    switch (this.oneclick) {
		  case 1:
			  mainPanel.setAttribute("onclick","nagioschecker.statusBarOnClick(event,'main');");
			  break;
		  case 3:
		  	mainPanel.setAttribute("onclick","nagioschecker.showNchPopup(this,event,'nagioschecker-popup');");
			  break;
		  default:
	  		mainPanel.removeAttribute("onclick");
			  break;		
	  }

	  if (this.oneclick>0) {
			mainPanel.setAttribute("style","cursor:pointer");
      for (var pType in fld) {
        fld[pType].setAttribute("style","cursor:pointer");
      }
	  }

	  if (this.oneclick==2){
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
      if (this.oneclick==4) {
        for (var pType in fld) {
          fld[pType].setAttribute("style","cursor:pointer");
    	    fld[pType].setAttribute("onclick","nagioschecker.showNchPopup(this,event,'nagioschecker-popup-"+pType+"');");
        }
      }
      else {
        for (var pType in fld) {
          fld[pType].removeAttribute("onclick");
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


    if ((isAny) && (this.infoWindowType>0)) {
      if (this.infoWindowType==1) {
        mainPanel.setAttribute("tooltip", "nagioschecker-tooltip");
        for (var pType in fld) {
          fld[pType].removeAttribute("tooltip");
        } 
      }
      else {
  		  mainPanel.removeAttribute("tooltip");
        for (var pType in fld) {
          fld[pType].setAttribute("tooltip", "nagioschecker-tooltip-"+pType);
        }
      }
    }
    else {
  	  mainPanel.removeAttribute("tooltip");
      for (var pType in fld) {
        fld[pType].removeAttribute("tooltip");
      }
    }
  },


  updateStatus: function(ttIndi,firstRun) {

    if (ttIndi["all"][0]) {
      ttIndi["all"][0].create(document.getElementById('nagioschecker-popup'));
	    ttIndi["all"][0].create(document.getElementById('nagioschecker-tooltip'));
    }

    for(var i=0;i<this.pt.length;i++) {
      if ((ttIndi[this.pt[i]]) && (ttIndi[this.pt[i]][0])) {
        ttIndi[this.pt[i]][0].create(document.getElementById('nagioschecker-tooltip-'+this.pt[i]));
        ttIndi[this.pt[i]][0].create(document.getElementById('nagioschecker-popup-'+this.pt[i]));
      }
    }


    this.resetBehavior((ttIndi["all"][1]>0));

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
    if (this.infoType>2) {
      for (var pType in fld) {
        var x = "";
        for (var i = 0; i < ttIndi[pType][3].length; i++) {
          if (ttIndi[pType][3][i]>0) {
              x+=((x) ? " + " : "")+((this.infoType<5) ? this._servers[i].name+' ' : '')+ttIndi[pType][3][i];
          }
        }
    	  fld[pType].setAttribute("value", this.getCorrectBundleString(ttIndi[pType][1],infoTypes[pType][(this.infoType==3) ? 1 : 2],x));
      }

    }
    else {
    	fld["down"].setAttribute("value", this.getCorrectBundleString(ttIndi["down"][1],infoTypes["down"][this.infoType],""));
  	  fld["unreachable"].setAttribute("value", this.getCorrectBundleString(ttIndi["unreachable"][1],infoTypes["unreachable"][this.infoType],""));
		  fld["unknown"].setAttribute("value", this.getCorrectBundleString(ttIndi["unknown"][1],infoTypes["unknown"][this.infoType],""));
		  fld["warning"].setAttribute("value", this.getCorrectBundleString(ttIndi["warning"][1],infoTypes["warning"][this.infoType],""));
		  fld["critical"].setAttribute("value", this.getCorrectBundleString(ttIndi["critical"][1],infoTypes["critical"][this.infoType],""));
    }

    fld["down"].setAttribute("hidden", (((ttIndi["down"][1]==0) || (!this.showSb["down"])) ? "true" : "false"));
    fld["unreachable"].setAttribute("hidden", (((ttIndi["unreachable"][1]==0) || (!this.showSb["unreachable"])) ? "true" : "false"));
    fld["unknown"].setAttribute("hidden", (((ttIndi["unknown"][1]==0) || (!this.showSb["unknown"])) ? "true" : "false"));
    fld["warning"].setAttribute("hidden", (((ttIndi["warning"][1]==0) || (!this.showSb["warning"])) ? "true" : "false"));
    fld["critical"].setAttribute("hidden", (((ttIndi["critical"][1]==0) || (!this.showSb["critical"])) ? "true" : "false"));

    document.getElementById('nagioschecker-info-label').setAttribute("hidden", "true");
/*
    if (gMini) {
      this.adjustSize(null,true);  
    }
*/
    this.setLoading(false);


    if (ttIndi["all"][1]>0) {

      var whichBlink = {
                  };      

      for (var pType in fld) {
        whichBlink[pType]=((ttIndi[pType][2]>0) || (this.blinking==2)) ? true : false;
      }

      if ((this.blinking==3) || (this.blinking==2) || ((this.blinking==1) && (ttIndi["all"][2]>0)) && (!firstRun)){
        this.blinkLabel(12,whichBlink);
      }
    }
    else {
      if (ttIndi["isError"]) {
        this.setNoData("error");
      }
      else {
        this.setNoData("noProblem");
      }
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
    alert(e);
  }
  },



 playSound: function(ttIndi) {
	var wav = null;
	if (ttIndi["down"][1]>0) {
		wav = this.sndDown;
	}
	else if (ttIndi["critical"][1]>0) {
		wav = this.sndCritical;
	}
	else if (ttIndi["warning"][1]>0) {
		wav = this.sndWarning;
	}
	if (wav!=null) {
    try {
      var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
          var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var soundUri = ioService.newURI(wav, null, null);
/*
      var soundUri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
      soundUri.spec = "chrome://nagioschecker/content/"+wav;
*/
      sound.play(soundUri);
    }
    catch(e) {
      alert(e);
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

		 if ((this.infoType==2) || (this.infoType==5)) {
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
    if (loading) {
      this.setIcon("loading");
    } else {
      this.setIcon("nagios");
    }
  },

  setIcon: function(type) {

    var ico = document.getElementById('nagioschecker-img');
    if (type == "loading") {
      ico.setAttribute("src","chrome://nagioschecker/skin/Throbber.gif");
    } else if (type == "nagios") {
      ico.setAttribute("src","chrome://nagioschecker/skin/nagios16.png");
    } else if (type == "sleepy") {
      ico.setAttribute("src","chrome://nagioschecker/skin/nagiosZzz.png");
    }
  },

  // retrive actual time and workingtime thnen calculate whether or not check Nagios status
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
  }

}


function NCHToolTip(showColInfo,showColAlias) {
  this._rows=null;
  this.title=title;
  this._vbox=null;
  this.headers = [];
  this.showColInfo=showColInfo;
  this.showColAlias=showColAlias;
	this.actH=-1;
  this.create = function(from) {
    this._tooltip=from;


    var doc=document;

    while (this._tooltip.childNodes.length > 0) this._tooltip.removeChild(this._tooltip.childNodes[0]);
    this._tooltip.removeAttribute("title");
    this._tooltip.removeAttribute("label");

    if (doc) {

    var ph=window.screen.height-300;
    ph=(ph<500) ? 500 : ph;

    this._vbox = doc.createElement("vbox");
    this._vbox.setAttribute("style","overflow: auto");

		var grid = doc.createElement("grid");
		this._vbox.appendChild(grid);
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

	 for(var i = 0;i<this.headers.length;i++) {
    	if ((this.headers[i].problems.length) || (this.headers[i].error)) {
			this.createHeader(this.headers[i].data);  
        	if (!this.headers[i].error) {

	  			this.headers[i].problems.sort(function (a,b) {
					return a.durationSec-b.durationSec;				
				});
				for(var j = 0;j<this.headers[i].problems.length;j++) {
					var serPo = this.headers[i].serPo;
  			  		this.createRow(this.headers[i].problems[j],serPo);
        		}
        	}
        	else {
         	this.createError();
        	}
      }
    }


		this._tooltip.appendChild(this._vbox);
    this._tooltip.setAttribute("style","max-height:"+ph+"px;");


	  }



  }
  this.createHeader= function(name) {

    var doc=document;

    if (doc) {
		var separator = doc.createElement("separator");
		separator.setAttribute("class", "groove-thin");
		this._rows.appendChild(separator);

    var description = doc.createElement("description");
		description.setAttribute("class", "nagioschecker-tooltip-title");
		description.setAttribute("value",name);
		this._rows.appendChild(description);

		var separator = doc.createElement("separator");
		separator.setAttribute("class", "groove-thin");
		this._rows.appendChild(separator);
    }

  }
  this.createError= function() {

    var doc=document;

		var row = document.createElement("row");
 		this._rows.appendChild(row);
		var lErr = document.createElement("label");
		lErr.setAttribute("class","error");
		lErr.setAttribute("value", nagioschecker.bundle.getString("downloadError"));
		row.appendChild(lErr);



  }
  this.addHeader= function(name,serPo) {
		this.headers[++this.actH]={data:name,error:false,problems:[],aliases:{},news:{},servPos:serPo};
	}
  this.addError= function() {
		this.headers[this.actH].error=true;
	}
  this.addRow = function(problem,alias,isNew) {
		this.headers[this.actH].problems.push(problem);

		this.headers[this.actH].aliases[problem.host]=alias;
		this.headers[this.actH].news[problem.host]=isNew;
	}


  
  this.createRow = function(problem,i) {

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

		row.setAttribute("onclick","nagioschecker.hideNchPopup('"+this._tooltip.id+"');nagioschecker.openTab(nagioschecker.createUrlDevice('"+i+"','"+problem.host+"',"+((problem.service) ? "'"+problem.service+"'" : "null")+"))");

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

		var lStat = document.createElement("label");
		lStat.setAttribute("value", status_text);
		row.appendChild(lStat);

		var lTime = document.createElement("label");
		lTime.setAttribute("value", problem.duration);
		row.appendChild(lTime);


    if (this.showColInfo) {
		var lInfo = document.createElement("label");
		lInfo.setAttribute("value", problem.info);
		row.appendChild(lInfo);
    }
  }
}
