function NCHPass() {

};

NCHPass.prototype = {

  start: function() {
  },

  cleanAuth : function(pos) {
    var ret = {"user":null,"password":null};

var CC_passwordManager = Components.classes["@mozilla.org/passwordmanager;1"];
var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];
     
if (CC_passwordManager != null) {
   // Password Manager exists so this is not Firefox 3 (could be Firefox 2, Netscape, SeaMonkey, etc).
   // Password Manager code
   
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
   // Login Manager exists so this is Firefox 3
   // Login Manager code
   
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

 var authLoginInfo = new nsLoginInfo('nagioschecker-url-'+pos,
                       null, '',
                       username, password, null, null);
	CC_loginManager.addLogin(authLoginInfo);

	
}

  },
  getAuth : function(pos) {
    var ret = {"user":null,"password":null};

var CC_passwordManager = Components.classes["@mozilla.org/passwordmanager;1"];
var CC_loginManager = Components.classes["@mozilla.org/login-manager;1"];
     
if (CC_passwordManager != null) {
   // Password Manager exists so this is not Firefox 3 (could be Firefox 2, Netscape, SeaMonkey, etc).
   // Password Manager code
   
    var passwordManager = CC_passwordManager.getService(Components.interfaces.nsIPasswordManager);

    this.e = passwordManager.enumerator;

    while (this.e.hasMoreElements()) {
      try {
        var pass = this.e.getNext().QueryInterface(Components.interfaces.nsIPassword);
        if (pass.host == "nagioschecker-url-"+pos) {
          ret=pass;
        }
      } catch (ex) {
      }
    }

   
}
else if (CC_loginManager!= null) {
   // Login Manager exists so this is Firefox 3
   // Login Manager code
   
   
   var loginManager = CC_loginManager.getService(Components.interfaces.nsILoginManager);
      // Find users for the given parameters
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
