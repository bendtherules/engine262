Example 1 - Callback, Emulate -

LE - 
```
// const data = await fetchData();
// setTimeout(() => console.log(data), 100);

let getApple;
{
  const apple = '🍏'; // fetchApple()
  getApple = () => console.log(apple);
}
cb(getApple);

function cb(fn) {
  fn();
}
```

D - 
```
let getApple;
{
  const apple = '🍏'; // fetchApple()
  getApple = function (apple) {
    console.log(apple);
    apple = 123;
  }
  getApple = getApple.bind(undefined, apple);
}
cb(getApple);
cb(getApple);

function cb(fn) {
  fn();
}
```

Example 2 - Nested config -

LE -
```
function func1(config) {
  console.log(config.foo);
  func2(config);
}
function func2(config) {
  console.log(config.bar + config.biz);
}
function main(config) { // exported
  func1(config);
};

{ // new file
  const config = {
  	foo: 1, bar: 2, biz: 3,
  }; // getConfig()
  
  main(config);
}
```

D -
```
function func1() {
  console.log(config.foo);
  func2();
}
function func2() {
  console.log(config.bar + config.biz);
}
function main() { // exported
  func1();
};

{ // new file
  const config = {
  	foo: 1, bar: 2, biz: 3,
  }; // getConfig()
  
  main();
}
```

Example 3 - Refactoring -

D - 
```
const apple = '🍏';
function getApple() { // exported
  console.log(apple);
};

{ // file 1
  const apple = '🥥';
  // lot of code
  {
  	getApple();
  }
}

{ // file 2
  
  // onSomething(getApple)
  // onsomething calls
  const apple = '🥥';
    getApple();
}
```