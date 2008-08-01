function doOK() {
  var edited = {
    name: document.getElementById('nch-general-name').value,
    url: document.getElementById('nch-general-url').value,
    urlstatus: document.getElementById('nch-general-urlstatus').value,
    username: document.getElementById('nch-general-username').value,
    password: document.getElementById('nch-general-password').value,
    versionOlderThan20: document.getElementById('nch-general-vot20').checked,
    serverType: document.getElementById('nch-general-server_type').selectedItem.value,
    plainPass: document.getElementById('nch-general-plainpass').checked,
    getAliases: document.getElementById('nch-general-getaliases').checked,
    disabled: document.getElementById('nch-general-disabled').checked
  }
  window.arguments[2](window.arguments[1],edited);
}


function nchFindStatus() {

  var parser = new NCHParser();
  
  switchFind(true);

  if (document.getElementById('nch-general-url').value!="") {
    var me = document;
	  parser.downloadStatus(document.getElementById('nch-general-url').value,document.getElementById('nch-general-username').value,document.getElementById('nch-general-password').value,function(urlst) {
      switchFind(false);
  	  if (!urlst) {
        alertMessage("missingUrlHeader","statusUrlNotFound");
		  }
      else {
        document.getElementById('nch-general-urlstatus').value=urlst;
      }
	  });
  }
  else {
    switchFind(false);
    alertMessage("missingUrlHeader","statusUrlNotFound");
  }
}

function handleSetManually() {
  var check = document.getElementById('nch-new-set_url_manually');
	if (check.checked) {
    document.getElementById('nch-general-urlstatus').removeAttribute("readonly");
  }
  else {
    document.getElementById('nch-general-urlstatus').setAttribute("readonly","true");    
  }
  
}

function switchFind(on) {
	document.getElementById('find-progress').setAttribute("mode",(on) ? "undetermined" : "determined");    
	document.getElementById('find-button').setAttribute("disabled",(on) ? "true" : "false");
  if (on) {
    document.getElementById('nagioschecker-new-dialog').setAttribute("wait-cursor",(on) ? "true" : "false");
  }
  else {
    document.getElementById('nagioschecker-new-dialog').removeAttribute("wait-cursor");
  }
}
function warnPlainPass() {
  if (document.getElementById('nch-general-plainpass').checked) {
    alertMessage("securityWarning","warningPlainPass");
  }
}
function alertMessage(header,mess) {
  var bundle = document.getElementById("nch-strings");
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
  var result = prompts.alert(window, bundle.getString(header), bundle.getString(mess));
}


function nchAcceptPreferences() {

  var bundle = document.getElementById("nch-strings");

  if (document.getElementById('nch-general-urlstatus').value=="") {
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
    var result = prompts.confirm(window, bundle.getString("missingUrlHeader"), bundle.getString("missingUrl")+"\n\n"+bundle.getString("doYouWantContinue"));

    if (result) {
      doOK();
      return true;
    }    
    else {
      return false;
    }

  }
  else {
    doOK();
    return true;
  }

}

function nchLoadPreferences() {
  if (window.arguments[0]) {
    var server = window.arguments[0];
    document.getElementById('nch-general-url').value=server.url;
    document.getElementById('nch-general-name').value=server.name;
    document.getElementById('nch-general-urlstatus').value=server.urlstatus;
    document.getElementById('nch-general-username').value=server.username;
    document.getElementById('nch-general-password').value=server.password;
    document.getElementById('nch-general-vot20').checked=server.versionOlderThan20;
    document.getElementById('nch-general-server_type').selectedIndex=server.serverType;
    document.getElementById('nch-general-plainpass').checked=server.plainPass;
    document.getElementById('nch-general-getaliases').checked=server.getAliases;
    document.getElementById('nch-general-disabled').checked=server.disabled;
  }

  nchControlPreferences();

	return true;
}

function nchControlPreferences() {
  var is_url = (document.getElementById('nch-general-url').value!="");

  if (is_url) {
    document.getElementById('nch-general-username').removeAttribute('disabled');
    document.getElementById('nch-general-password').removeAttribute('disabled');
    document.getElementById('nch-general-plainpass').removeAttribute('disabled');
    document.getElementById('find-button').removeAttribute('disabled');
    document.getElementById('find-progress').removeAttribute('disabled');
    document.getElementById('nch-general-getaliases').removeAttribute('disabled');
    document.getElementById('nch-general-disabled').removeAttribute('disabled');
  }
  else {
    document.getElementById('nch-general-username').setAttribute('disabled','true');
    document.getElementById('nch-general-password').setAttribute('disabled','true');
    document.getElementById('nch-general-plainpass').setAttribute('disabled','true');
    document.getElementById('find-button').setAttribute('disabled','true');
    document.getElementById('find-progress').setAttribute('disabled','true');
    document.getElementById('nch-general-getaliases').setAttribute('disabled','true');
    document.getElementById('nch-general-disabled').setAttribute('disabled','true');
  }
	
	return true;
}
