// test.js — basic testing setup for playGround

// Example test cases
function testLang() {
  const lang = window.Lang;
  console.assert(lang.t('Привет', 'Sveiki', 'Hello') === 'Hello · Привет', 'Test failed: Language translation');
  console.assert(lang.t('Привет', 'Sveiki', 'Привет') === 'Привет', 'Test failed: No duplicate translation');
}

testLang();
console.log('All tests passed!');