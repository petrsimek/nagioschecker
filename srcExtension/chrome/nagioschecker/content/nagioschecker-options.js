var gNCHOptions = null;

var nchoptionsLoad = function() {

  gNCHOptions = new NCHOptions();

  gNCHOptions.loadPref();
  gNCHOptions.disableSoundCheckboxes();
  gNCHOptions.disableSoundRadios();
};

var nchoptionsUnload = function() {
  gNCHOptions = null;
}

function GetTreeSelections(tree) {
  var selections = [];
  var select = (typeof(tree.treeBoxObject.selection)=="object") ? tree.treeBoxObject.selection : tree.view.selection;
  if (select) {
    var count = select.getRangeCount();
    var min = new Object();
    var max = new Object();
    for (var i=0; i<count; i++) {
      select.getRangeAt(i, min, max);
      for (var k=min.value; k<=max.value; k++) {
        if (k != -1) {
          selections[selections.length] = k;
        }
      }
    }
  }
  return selections;
}


function NCHOptions() {};

NCHOptions.prototype = {

  _servers: [],
  _tree: null,
  _origServerCount: 20,
  bundle:null,

  addServer: function(server) {
    this._servers.push(server);
  },
  setServer: function(pos,server) {
    this._servers[pos]=server;
  },

  removeServer: function(pos) {
    var tmp = [];
    for(var i=0;i<this._servers.length;i++) {
      if (i!=pos) {
         tmp.push(this._servers[i]);
      }  
    }
    this._servers=tmp;
  },

  hostSelected: function() {
    var selections = GetTreeSelections(this._tree);
    document.getElementById("remove-button").disabled = (selections.length < 1);
    document.getElementById("edit-button").disabled = (selections.length < 1);
    document.getElementById("able-button").disabled = (selections.length < 1);

    var i = selections[0];
	document.getElementById("able-button").setAttribute("label",(this._servers[i].disabled) ? gNCHOptions.bundle.getString("enable") : gNCHOptions.bundle.getString("disable"));

///    alert(i+";"+this._servers.length);

	document.getElementById("up-button").disabled = (i==0);    
    document.getElementById("down-button").disabled = (i==(this._servers.length-1));

  },

  alertServers: function() {
    var str ="";
    for(var i=0;i<this._servers.length;i++) {
      str+=this._servers[i].name+" "+this._servers[i].url+"\n";
    }
    alert(str);
  },

  disableSoundCheckboxes: function() {
    var disable = (document.getElementById('nch-behavior-play_sound-0').selected);

    document.getElementById('nch-behavior-sounds_by_type_down').disabled=disable;
    document.getElementById('nch-behavior-sounds_by_type_unreachable').disabled=disable;
    document.getElementById('nch-behavior-sounds_by_type_critical').disabled=disable;
    document.getElementById('nch-behavior-sounds_by_type_warning').disabled=disable;
    document.getElementById('nch-behavior-sounds_by_type_unknown').disabled=disable;

  },

  disableSoundRadios: function() {
    var disableWarning = (document.getElementById('nch-sounds-warning-0').selected);
    var disableCritical = (document.getElementById('nch-sounds-critical-0').selected);
    var disableDown = (document.getElementById('nch-sounds-down-0').selected);

    document.getElementById("nch-sounds-warning-custom-path").disabled=disableWarning;
    document.getElementById("nch-sounds-warning-custom-select").disabled=disableWarning;
    document.getElementById("nch-sounds-critical-custom-path").disabled=disableCritical;
    document.getElementById("nch-sounds-critical-custom-select").disabled=disableCritical;
    document.getElementById("nch-sounds-down-custom-path").disabled=disableDown;
    document.getElementById("nch-sounds-down-custom-select").disabled=disableDown;

  },


  removeAllServers: function() {
    this._servers.length = 0;

    var oldCount = this._view._rowCount;
    this._view._rowCount = 0;
    this._tree.treeBoxObject.rowCountChanged(0, -oldCount);

    document.getElementById('remove-button').setAttribute("disabled", "true")
    document.getElementById('remove-all-button').setAttribute("disabled","true");
  },

  addNewServer: function() {
    var me = this;
    window.openDialog('chrome://nagioschecker/content/nagioschecker-new.xul','nagioschecker-new','centerscreen, chrome, modal',null,null,function (pos,added) {
      me.onAddedServer(pos,added);
    });
  },

  editSelectedServer: function () {
    var selections = GetTreeSelections(this._tree);
    var i = selections[0];
    var me = this;
    window.openDialog('chrome://nagioschecker/content/nagioschecker-new.xul','nagioschecker-new','centerscreen, chrome, modal',this._servers[i],(i+1),function (pos,added) {
      me.onAddedServer(pos,added);
    });
  },
  
  actionOnSelectedServer: function(action) {
    var selections = GetTreeSelections(this._tree);
	var i = selections[0];
  	switch (action) {
  		case "able":
			this._servers[i].disabled=!this._servers[i].disabled;
		    this._tree.treeBoxObject.invalidate();
			document.getElementById("able-button").setAttribute("label",(this._servers[i].disabled) ? gNCHOptions.bundle.getString("enable") : gNCHOptions.bundle.getString("disable"));    
  			break;
  		case "up":
		    if (i>0) {
				var tmp = this._servers[i];
				this._servers[i]=this._servers[i-1];
				this._servers[i-1]=tmp;
				this._tree.treeBoxObject.view.selection.select(i-1);
		      	this._tree.treeBoxObject.ensureRowIsVisible(i-1);
			    this._tree.treeBoxObject.invalidate();
		    }
			document.getElementById("up-button").disabled = ((i-1)==0);    
			break;
  		case "down":
		    if (i<(this._servers.length-1)) {
				var tmp = this._servers[i];
				this._servers[i]=this._servers[i+1];
				this._servers[i+1]=tmp;
				this._tree.treeBoxObject.view.selection.select(i+1);
		      	this._tree.treeBoxObject.ensureRowIsVisible(i+1);
			    this._tree.treeBoxObject.invalidate();
		    }
		    document.getElementById("down-button").disabled = ((i+1)==(this._servers.length-1));
  			break;
  	}
  },
  
  onAddedServer: function(pos,added) {
    if (pos) {
      this.setServer((pos-1),added);
    }
    else {
      this.addServer(added);
      this._view._rowCount = this._servers.length;
      this._tree.treeBoxObject.rowCountChanged(this._servers.length-1, 1);
      this._tree.treeBoxObject.ensureRowIsVisible(this._servers.length-1);
    }
    this._tree.treeBoxObject.invalidate();

  },

  removeSelectedServer: function() {
    this._tree.treeBoxObject.view.selection.selectEventsSuppressed = true;
    var selections = GetTreeSelections(this._tree);
    for (var s=selections.length-1; s>= 0; s--) {
      var i = selections[s];
      this._servers[i] = null;
    }

    for (var j=0; j<this._servers.length; j++) {
      if (this._servers[j] == null) {
        var k = j;
        while ((k < this._servers.length) && (this._servers[k] == null)) {
          k++;
        }
        this._servers.splice(j, k-j);
        this._tree.treeBoxObject.rowCountChanged(j, j - k);
      }
    }

    if (this._servers.length) {

      var nextSelection = (selections[0] < this._servers.length) ? selections[0] : this._servers.length-1;
      this._tree.treeBoxObject.view.selection.select(nextSelection);
      this._tree.treeBoxObject.ensureRowIsVisible(nextSelection);

    }
    else {
      document.getElementById('remove-button').setAttribute("disabled", "true")

    }

    this._tree.treeBoxObject.view.selection.selectEventsSuppressed = false;
  },


  _view: {
    _rowCount: 0,
    get rowCount() { 
      return this._rowCount; 
    },
    getCellText: function (aRow, aColumn) {
      switch( typeof(aColumn)=="object" ? aColumn.id : aColumn ) {
        case "nameCol":
          return (gNCHOptions._servers[aRow]==null) ? "" : gNCHOptions._servers[aRow].name;
        case "urlCol":
          return (gNCHOptions._servers[aRow]==null) ? "" : gNCHOptions._servers[aRow].url;
        case "aliasCol":
          return (gNCHOptions._servers[aRow]==null) ? "" : (gNCHOptions._servers[aRow].getAliases) ? gNCHOptions.bundle.getString("yes") : gNCHOptions.bundle.getString("no");
        case "disCol":
          return (gNCHOptions._servers[aRow]==null) ? "" : (gNCHOptions._servers[aRow].disabled) ? gNCHOptions.bundle.getString("yes") : gNCHOptions.bundle.getString("no");
        default:
          return null;
      }
    },
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {},
    getProgressMode: function(aRow, aColumn) {},
    getCellValue: function(aRow, aColumn) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(aRow, aProperty) {
    },
    getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
    getCellProperties: function(aRow, aCol,aProperty) {
    
		if (gNCHOptions._servers[aRow].disabled){
			var aserv=Components.classes["@mozilla.org/atom-service;1"].
              getService(Components.interfaces.nsIAtomService);
			aProperty.AppendElement(aserv.getAtom("disServer"));
		}
    
    
    }
  },

  selectFile: function(into) {

  	const nsIFilePicker = Components.interfaces.nsIFilePicker;
  	const nsILocalFile = Components.interfaces.nsILocalFile;
  	var fp = Components.classes["@mozilla.org/filepicker;1"]
	                 .createInstance(nsIFilePicker);
	fp.init(window, this.bundle.getString("selectWavFile"), nsIFilePicker.modeOpen);
  fp.appendFilter(this.bundle.getString("wavFiles"),"*.wav");
	var ret = fp.show();

	var fileField = document.getElementById(into);
	if (ret == nsIFilePicker.returnOK) {
		var localFile = fp.file.QueryInterface(nsILocalFile);
		var viewable = fp.file.path;
		fileField.value = viewable;
	}
	else if (ret == nsIFilePicker.returnCancel) {

	}


  },

  savePref: function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);

	  var checkboxes = [
        "nch-view-show_statusbar_down",
        "nch-view-show_statusbar_unreachable",
        "nch-view-show_statusbar_critical",
        "nch-view-show_statusbar_warning",
        "nch-view-show_statusbar_unknown",
        "nch-general-filter_out_all_down",
        "nch-general-filter_out_all_unreachable",
        "nch-general-filter_out_all_critical",
        "nch-general-filter_out_all_warning",
        "nch-general-filter_out_all_unknown",
        "nch-general-filter_out_regexp_hosts",
        "nch-general-filter_out_regexp_services",
        "nch-view-show_window_column_information",
        "nch-view-show_window_column_alias",
        "nch-general-one_window_only",
        "nch-general-filter_out_acknowledged",
        "nch-general-filter_out_disabled_notifications",
        "nch-general-filter_out_disabled_checks",
        "nch-general-filter_out_soft_states",
        "nch-general-filter_out_downtime",
        "nch-general-filter_out_services_on_down_hosts",
        "nch-general-filter_out_services_on_acknowledged_hosts",
        "nch-behavior-sounds_by_type_down",
        "nch-behavior-sounds_by_type_unreachable",
        "nch-behavior-sounds_by_type_critical",
        "nch-behavior-sounds_by_type_warning",
        "nch-behavior-sounds_by_type_unknown"
        ];
	
  	for (var i = 0; i < checkboxes.length; ++i) {
		  var checkbox = document.getElementById(checkboxes[i]);
		  prefs.setBoolPref(checkbox.getAttribute("prefstring"), checkbox.checked);
	  }

		var radios = [
       "nch-view-info_type",
       "nch-view-info_window_type",
       "nch-behavior-blinking",
       "nch-behavior-play_sound",
       "nch-behavior-oneclick",
       "nch-sounds-warning",
       "nch-sounds-critical",
       "nch-sounds-down"
       ];
    for (var i = 0; i < radios.length; ++i) {
  		var radiogroup = document.getElementById(radios[i]);
		  prefs.setIntPref(radiogroup.getAttribute("prefstring"), radiogroup.selectedItem.value);
		}		
		var INTtextboxes = ["nch-general-refresh"];
  	for (var i = 0; i < INTtextboxes.length; ++i) {
		  var textbox = document.getElementById(INTtextboxes[i]);
		  prefs.setIntPref(textbox.getAttribute("prefstring"), textbox.value);
	  }
		var STRtextboxes = [
       "nch-sounds-warning-custom-path",
       "nch-sounds-critical-custom-path",
       "nch-sounds-down-custom-path",
       "nch-general-worktime-from",
       "nch-general-worktime-to",
        "nch-general-filter_out_regexp_hosts_value",
        "nch-general-filter_out_regexp_services_value"
        ];
	  for (var i = 0; i < STRtextboxes.length; ++i) {
  		var textbox = document.getElementById(STRtextboxes[i]);
		  prefs.setCharPref(textbox.getAttribute("prefstring"), textbox.value);
	  }


    var pm = new NCHPass();
    var i=0;
    try {
      for(var j=0;j<this._servers.length;j++) {
        if (this._servers[j]) {
          prefs.setCharPref("extensions.nagioschecker."+(i+1)+".url",this._servers[j].url);
          prefs.setCharPref("extensions.nagioschecker."+(i+1)+".name",this._servers[j].name);
          prefs.setCharPref("extensions.nagioschecker."+(i+1)+".urlstatus",this._servers[j].urlstatus);
          prefs.setBoolPref("extensions.nagioschecker."+(i+1)+".vot20",this._servers[j].versionOlderThan20);
          prefs.setBoolPref("extensions.nagioschecker."+(i+1)+".plainpass",this._servers[j].plainPass);
          prefs.setBoolPref("extensions.nagioschecker."+(i+1)+".getaliases",this._servers[j].getAliases);
          prefs.setCharPref("extensions.nagioschecker."+(i+1)+".username",(this._servers[j].plainPass) ? this._servers[j].username : "");
          prefs.setCharPref("extensions.nagioschecker."+(i+1)+".password",(this._servers[j].plainPass) ? this._servers[j].password : "");
          prefs.setBoolPref("extensions.nagioschecker."+(i+1)+".disabled",(this._servers[j].disabled));
          if (!this._servers[j].plainPass) {
            pm.saveAuth((this._servers[j].username) ? this._servers[j].username : "",(this._servers[j].password) ? this._servers[j].password : "",(i+1));  
          }
          else {
            pm.cleanAuth((i+1));
          }

        }
        i++;
      }  
      for(var j=i;j<this._origServerCount;j++) {
          prefs.deleteBranch("extensions.nagioschecker."+(j+1));
          pm.cleanAuth((j+1));
      }

    }
    catch (e) {
//alert(e);
    }


    Components.classes["@mozilla.org/observer-service;1"]
         .getService(Components.interfaces.nsIObserverService)
         .notifyObservers(window, "nagioschecker:preferences-changed", null);


    return true;
  },

  replaySoundFile: function(type,wav) {
      switch (document.getElementById('nch-sounds-'+type).selectedItem.value) {
        case "0":
          var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var soundUri = ioService.newURI("chrome://nagioschecker/content/"+wav, null, null);

          break;
        case "1":
          var fileName=document.getElementById('nch-sounds-'+type+'-custom-path').value;
          var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var soundUri = ioService.newURI("file:///"+fileName, null, null);
          break;
      }
      var sound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
      sound.play(soundUri);

  },

  loadPref: function() {

    this.bundle = document.getElementById("nch-strings");

    var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
	  try {
  		var checkboxes = [
        "nch-view-show_statusbar_down",
        "nch-view-show_statusbar_unreachable",
        "nch-view-show_statusbar_critical",
        "nch-view-show_statusbar_warning",
        "nch-view-show_statusbar_unknown",
        "nch-general-filter_out_all_down",
        "nch-general-filter_out_all_unreachable",
        "nch-general-filter_out_all_critical",
        "nch-general-filter_out_all_warning",
        "nch-general-filter_out_all_unknown",
        "nch-general-filter_out_regexp_hosts",
        "nch-general-filter_out_regexp_services",
        "nch-view-show_window_column_information",
        "nch-view-show_window_column_alias",
        "nch-general-one_window_only",
        "nch-general-filter_out_acknowledged",
        "nch-general-filter_out_disabled_notifications",
        "nch-general-filter_out_disabled_checks",
        "nch-general-filter_out_soft_states",
        "nch-general-filter_out_downtime",
        "nch-general-filter_out_services_on_down_hosts",
        "nch-general-filter_out_services_on_acknowledged_hosts",
        "nch-behavior-sounds_by_type_down",
        "nch-behavior-sounds_by_type_unreachable",
        "nch-behavior-sounds_by_type_critical",
        "nch-behavior-sounds_by_type_warning",
        "nch-behavior-sounds_by_type_unknown"
        ];
		  for (var i = 0; i < checkboxes.length; ++i) {
  			var checkbox = document.getElementById(checkboxes[i]);
			  checkbox.checked = prefs.getBoolPref(checkbox.getAttribute("prefstring"));
		  }	
  		var radios = [
        "nch-view-info_type",
        "nch-view-info_window_type",
        "nch-behavior-blinking",
        "nch-behavior-play_sound",
       "nch-behavior-oneclick",
       "nch-sounds-warning",
       "nch-sounds-critical",
       "nch-sounds-down"
        ];
		  for (var i = 0; i < radios.length; ++i) {
  			var radiogroup = document.getElementById(radios[i]);
        var radioid = radios[i]+'-'+prefs.getIntPref(radiogroup.getAttribute("prefstring"));
			  radiogroup.selectedItem=document.getElementById(radioid);
		  }	
		  var INTtextboxes = ["nch-general-refresh"];
		  for (var i = 0; i < INTtextboxes.length; ++i) {
  			var textbox = document.getElementById(INTtextboxes[i]);
			  var prefstring = textbox.getAttribute("prefstring");
			  textbox.value = prefs.getIntPref(prefstring);
		  }
  	  var STRtextboxes = [
       "nch-sounds-warning-custom-path",
       "nch-sounds-critical-custom-path",
       "nch-sounds-down-custom-path",
       "nch-general-worktime-from",
       "nch-general-worktime-to",
        "nch-general-filter_out_regexp_hosts_value",
        "nch-general-filter_out_regexp_services_value"
       ];
		  for (var i = 0; i < STRtextboxes.length; ++i) {
  			var textbox = document.getElementById(STRtextboxes[i]);
			  var prefstring = textbox.getAttribute("prefstring");
			  textbox.value = prefs.getCharPref(prefstring);
		  }
    }
    catch(e) {
    }
      var pm = new NCHPass();
   


      for(var i=0;i<20;i++) {
        try {
          var surl = prefs.getCharPref("extensions.nagioschecker."+(i+1)+".url");
        try {
          var vot20 = prefs.getBoolPref("extensions.nagioschecker."+(i+1)+".vot20");
        }
        catch (e) {
          var vot20 = false;
        }
        try {
          var pPass = prefs.getBoolPref("extensions.nagioschecker."+(i+1)+".plainpass");
        }
        catch (e) {
          var pPass = false;
        }
        try {
          var getAli = prefs.getBoolPref("extensions.nagioschecker."+(i+1)+".getaliases");
        }
        catch (e) {
          var getAli = false;
        }
        try {
          var getDis = prefs.getBoolPref("extensions.nagioschecker."+(i+1)+".disabled");
        }
        catch (e) {
          var getDis = false;
        }
        
        try {
        if (surl) {
          var auth = pm.getAuth((i+1));
          this._servers.push({
                  url:surl,
                  name:prefs.getCharPref("extensions.nagioschecker."+(i+1)+".name"),
                  urlstatus:prefs.getCharPref("extensions.nagioschecker."+(i+1)+".urlstatus"),
                  versionOlderThan20:vot20,
                  plainPass:pPass,
                  getAliases:getAli,
                  disabled:getDis,
                  username:(pPass) ? prefs.getCharPref("extensions.nagioschecker."+(i+1)+".username") : ((auth.user) ? auth.user : ''),
                  password:(pPass) ? prefs.getCharPref("extensions.nagioschecker."+(i+1)+".password") : ((auth.password) ? auth.password : '')
                  });
        }
        }
        catch (e) {}


        }
        catch (e) {
          break;
        }
      }
    this._origServerCount=this._servers.length;
    this._tree=document.getElementById('hostList');
    this._view._rowCount = this._servers.length;
    this._tree.treeBoxObject.view = this._view;

    return true;

  }

}
