var populateId = function(userId) {
  var curriedPI = function() {
    populateId(userId);
  };
  if (document == null) {
//     alert('document == '+document);
     setTimeout(curriedPI, 1000);
  } else {
    var xpathres = document.evaluate('SCRIPT_REPLACE_ELEMENT_SEL', document, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE);
    var el = xpathres.iterateNext();
    var endElement = xpathres.iterateNext();
    if (endElement != null) {
      alert("Found multiple matches for xpath. Second match is "+endElement);
    }
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
