/*
	parseUri 1.2.1
	(c) 2007 Steven Levithan <stevenlevithan.com>
	MIT License
*/

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

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


function createNagiosUrl(server,type,host,service) {
	
	var parsed = parseUri(server.urlstatus);
	var url = parsed.protocol + '://' + parsed.authority + parsed.path;
	var params = [];

	if (type!='detail') {
		if (parsed.queryKey['hostgroup']) {
			params.push('hostgroup='+escape(parsed.queryKey['hostgroup']));
			params.push('style=detail');
		}
		else if (parsed.queryKey['servicegroup']) {
			params.push('servicegroup='+escape(parsed.queryKey['servicegroup']));
			params.push('style=detail');			
		}
		
		if (type=='host_problems') params.push('hostgroup=all');
		else if (type=='service_problems') params.push('host=all');
		
	}
	else url = url.replace(/status\.cgi/,'extinfo.cgi');
	
	switch (type) {
		case 'host_problems':
			params.push('style=hostdetail');
			params.push('hoststatustypes=12');
		break;
		case 'service_problems':
			params.push('servicestatustypes='+((server.versionOlderThan20) ? '248' : '28'));
		break;
		case 'detail':
			params.push('type='+((service) ? '2' : '1'));
			params.push('host='+escape(host));
			if (service) params.push('service='+escape(service));
		break;
	}
	
	if (params.length>0) url += '?' + params.join('&');

	return url;
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

function alertMessage(header,mess) {
	var bundle = document.getElementById("nch-strings");
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
	var result = prompts.alert(window, bundle.getString(header), bundle.getString(mess));
}

function confirmMessage(header,mess) {
	var bundle = document.getElementById("nch-strings");
	var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
	return prompts.confirm(window, bundle.getString(header), bundle.getString(mess));
}

function getExtensionVersion() {
  	var value = "";
  	try {
   		var RDFService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
             .getService(Components.interfaces.nsIRDFService);
   		var extensionDS= Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager).datasource;
   		var target = extensionDS.GetTarget(RDFService.GetResource("urn:mozilla:item:{123b2220-59cb-11db-b0de-0800200c9a66}"), RDFService.GetResource("http://www.mozilla.org/2004/em-rdf#version"), true);
   		value = target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  	} catch(e) {
  	}
  	return value;
 }


