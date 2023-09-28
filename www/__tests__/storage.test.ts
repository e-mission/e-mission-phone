it('stores a value in localstorage and then retrieves it', () => {
  localStorage.setItem("testKey", "testValue");
  expect(localStorage.getItem("testKey")).toBe("testValue");
});
