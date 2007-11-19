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
		if (logins[0]) {
			alert('mazu:'+logins[0].username);
			loginManager.removeLogin(logins[0]);
		}       

			
		}
		catch (e) {
			alert(e);
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

		alert('save:'+pos);
		alert(username+':'+password);
		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init");

		var authLoginInfo = new nsLoginInfo('nagioschecker-url-'+pos,
                       null, 'x',
                       username, password, null, null);
		try {
			var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
			var x = loginManager.addLogin(authLoginInfo);
			alert(x);	
		}
      	catch (e) {
      		alert(e);
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
   
   
		var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
      
		var logins = loginManager.findLogins({}, "nagioschecker-url-"+pos, null, '');
		if (logins[0]) {
			alert(logins[0].username);
			ret.user = logins[0].username;
			ret.password = logins[0].password;
		}       
	}

    return ret;
  }
}
