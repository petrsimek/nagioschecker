function NCHPass() {

};

NCHPass.prototype = {

  start: function() {
  },

  cleanAuth : function(pos) {
    var ret = {"user":null,"password":null};

    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);

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
  },
  saveAuth : function(username,password,pos) {
    var ret = {"user":null,"password":null};

    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);

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
  },
  getAuth : function(pos) {
    var ret = {"user":null,"password":null};
    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);

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

    return ret;
  }
}
