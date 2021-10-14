var populateId = function(userId) {
  var curriedPI = function() {
    populateId(userId);
  };
  if (document == null) {
//     alert('document == '+document);
     setTimeout(curriedPI, 1000);
  } else {
    var el = document.getElementById('SCRIPT_REPLACE_ELEMENT_SEL');
//    alert('document = '+document+ ' element = '+ el);
    if (el == null) {
//      alert('element == null!');
      setTimeout(curriedPI, 1000);
    } else {
      el.value = userId;
    }
  }
};

// alert("executing script");
populateId('SCRIPT_REPLACE_VALUE');
// alert("done executing script");
