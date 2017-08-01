var populateIdLABEL = function(time) {
  var curriedPILABEL = function() {
    populateIdLABEL(time);
  };
  if (document == null) {
//     alert('document == '+document);
     setTimeout(curriedPILABEL, 1000);
  } else {
    var el = document.getElementById('SCRIPT_REPLACE_ELEMENT_ID');
//    alert('document = '+document+ ' element = '+ el);
    if (el == null) {
//      alert('element == null!');
      setTimeout(curriedPILABEL, 1000);
    } else {
      el.value += time;
    }
  }
};

// alert("executing script");
populateIdLABEL('SCRIPT_REPLACE_VALUE');
// alert("done executing script");
