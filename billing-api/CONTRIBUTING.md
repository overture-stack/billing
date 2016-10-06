## Coding Conventions ##

Follow this: https://www.python.org/dev/peps/pep-0008/

### Strings ###

#### Single quotes outside, double quotes inside
**YES:**
```python
some_string = 'this is a string'
another_string = 'Oh hey, look at this string="foobar"'
```

**NO:**
```python
foo = "aaaa"
bar = "My string: 'baz'"
```


#### Format strings with the format function
**YES:**
```python
'Look at my pretty string: {}'.format(pretty_string)
```

**NO:**
```python
'I like TypeErrors like this one: %s` % unknown_type
```


### Exceptions ###

#### Never silently suppress exceptions
**YES:**
```python
try:
    # Some operation
    ...
except SomeError as e:
    logging.exception('Operation foo had an exception')
    
```

**NO:**
```python
try:
    # Some operation
    ...
except SomeError as e:
    continue
```

#### Platform Independence 

#### Use platform independent abstractions when possible
**YES:**
```python
open(os.devnull, 'w')
```

**NO:**
```python
open('/dev/null', 'w')
```