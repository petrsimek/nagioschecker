function NCHPass() {
};

NCHPass.prototype = {

  start: function() {
  },

  cleanAuth : function(pos) {
    var ret = false;
    
	var CC_passwordManager = Components.classes["@mozilla.org/passwordmanager;1"];
	var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];
     
	if (CC_passwordManager != null) {
   
	    var passwordManager = CC_passwordManager.getService(Components.interfaces.nsIPasswordManager);

	    this.e = passwordManager.enumerator;

	    while (this.e.hasMoreElements()) {
	      try {
	        var pass = this.e.getNext().QueryInterface(Components.interfaces.nsIPassword);
	        if (pass.host == "nagioschecker-url-"+pos) {
	          passwordManager.removeUser(pass.host,pass.user);
	        }
	      } catch (ex) {
	      }
	    }
   
   
	}
	else if (CC_loginManager!= null) {
		try {

			var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
			var logins = loginManager.findLogins({}, "nagioschecker-url-"+pos, null, '');
			if (logins[0]) loginManager.removeLogin(logins[0]);
			
		}
		catch (e) {
		}
		
	}

  },
  saveAuth : function(username,password,pos) {
    var ret = {"user":null,"password":null};


	var CC_passwordManager = Components.classes["@mozilla.org/passwordmanager;1"];
	var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];
     
	if (CC_passwordManager != null) {

	    var passwordManager = CC_passwordManager.getService(Components.interfaces.nsIPasswordManager);

	    this.e = passwordManager.enumerator;

	    while (this.e.hasMoreElements()) {
	      try {
	        var pass = this.e.getNext().QueryInterface(Components.interfaces.nsIPassword);
	        if (pass.host == "nagioschecker-url-"+pos) {
	          passwordManager.removeUser(pass.host,pass.user);
	        }
    	  } catch (ex) {
	      }
	    }

		passwordManager.addUser('nagioschecker-url-'+pos, username, password);


	}
	else if (CC_loginManager!= null) {

		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init");

		var authLoginInfo = new nsLoginInfo('nagioschecker-url-'+pos,
                       null, 'x',
                       username, password, null, null);
		try {
			var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
			loginManager.removeLogin(authLoginInfo);
			loginManager.addLogin(authLoginInfo);
		}
      	catch (e) {
      	}
	}

  },

  getAuth : function(pos) {
    var ret = {"user":null,"password":null};

	var CC_passwordManager = Components.classes["@mozilla.org/passwordmanager;1"];
	var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];
     
	if (CC_passwordManager != null) {
  
		var passwordManager = CC_passwordManager.getService(Components.interfaces.nsIPasswordManager);

		this.e = passwordManager.enumerator;

    	while (this.e.hasMoreElements()) {
      		try {
        		var pass = this.e.getNext().QueryInterface(Components.interfaces.nsIPassword);
        		if (pass.host == "nagioschecker-url-"+pos) {
         	 		ret=pass;
		        }
			}
			catch (ex) {
			}
		}
	}
	else if (CC_loginManager!= null) {
   
   		try {
		var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
/*		
		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init");
*/

		var x = loginManager.getAllLogins({});
		
		
		for(var i =0;i<x.length;x++) {
		alert('cnt:'+x.length);
		alert(x[i]);
		alert(x[i].username);
			if ((!x[i].httpRealm) && (x[i].hostname.match('nagioschecker-url-'))) {
				var newlogin = x[i];
//				var newlogin = new nsLoginInfo(x[i].hostname,null,'x',x[i].username,x[i].password,null,null);
				newlogin.httpRealm='x';
				loginManager.modifyLogin(x[i],newlogin);
			}
		}      
		var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
		var logins = loginManager.findLogins({}, "nagioschecker-url-"+pos, null, '');
		alert('cnt:'+logins.length);
		alert(logins[0]);
		alert(logins[0].username);
		alert(logins[0].httpRealm);
		if (logins[0]) {
			ret.user = logins[0].username;
			ret.password = logins[0].password;
		}       
   		}
   		catch (e) {
   			alert(e);
   		}
	}
	

    return ret;
  }
}
