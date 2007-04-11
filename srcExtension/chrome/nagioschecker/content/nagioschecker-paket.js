function NCHPaket() {};

NCHPaket.prototype = {
	pt:["down","unreachable","unknown","warning","critical"],
	
 all:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 down:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 unreachable:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 unknown:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 warning:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 critical:[new NCHToolTip(this.showColInfo,this.showColAlias),0,0,[],[]],
 isError:false,
 addTooltipHeader: function(to,header,serverPos) {
 	this[to][0].addHeader(header,serverPos);
 },
 addError: function(to) {
	this[to][0].addError();
	this["isError"]=true;
 },
 addProblem: function(serverPos,problemType,isOld,problem,aliasName) {
	if (!isOld) {
		this["all"][2] = (this["all"][2]) ? this["all"][2]+1 : 1;
		this["all"][4][serverPos] = (this["all"][4][serverPos]) ? this["all"][4][serverPos]+1 : 1;
		this[problemType][2] = (this[problemType][2]) ? this[problemType][2]+1 : 1;
		this[problemType][4][serverPos] = (this[problemType][4][serverPos]) ? this[problemType][4][serverPos]+1 : 1;
	} 	
	this[problemType][1] = (this[problemType][1]) ? this[problemType][1]+1 : 1;
	this[problemType][3][serverPos] = (this[problemType][3][serverPos]) ? this[problemType][3][serverPos]+1 : 1;
	this["all"][0].addRow(problem,aliasName,(!isOld));
	this[problemType][0].addRow(problem,aliasName,(!isOld));
	this["all"][1] = (this["all"][1]) ? this["all"][1]+1 : 1;
	this["all"][3][serverPos] = (this["all"][3][serverPos]) ? this["all"][3][serverPos]+1 : 1;
 },
 getProblemsByType: function(problemType) {
 	return this[problemType][3];
 },
 countProblemsByType: function(problemType) {
 	return this[problemType][1];
 },
 countOldProblemsByType: function(problemType) {
 	return this[problemType][2];
 },
 createTooltip: function() {
    if (this["all"][0]) {
      this["all"][0].create(document.getElementById('nagioschecker-popup'));
	    this["all"][0].create(document.getElementById('nagioschecker-tooltip'));
    }

    for(var i=0;i<this.pt.length;i++) {
      if ((this[this.pt[i]]) && (this[this.pt[i]][0])) {
        this[this.pt[i]][0].create(document.getElementById('nagioschecker-tooltip-'+this.pt[i]));
        this[this.pt[i]][0].create(document.getElementById('nagioschecker-popup-'+this.pt[i]));
      }
    }
 	
 },
 isAtLeastOne: function() {
 	return (this["all"][1]>0);
 }
}
