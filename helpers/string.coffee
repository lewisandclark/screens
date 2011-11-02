
###
  Title Caps

  Ported to CoffeeScript By David McKelvey - http://david.mckelveycreative.com/ - 10 October 2011
    (modified to handle all caps)
  Ported to JavaScript By John Resig - http://ejohn.org/ - 21 May 2008
  Original by John Gruber - http://daringfireball.net/ - 10 May 2008
  License: http://www.opensource.org/licenses/mit-license.php
###

small = "(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)"
punct = "([!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)"

lower = (word) ->
	word.toLowerCase()

upper = (word) ->
	word.substr(0,1).toUpperCase() + word.substr(1)

String::toTitleCaps = ->
  parts = []
  split = /[:.;?!] |(?: |^)["“]/g
  index = 0
  title = if this.toString() is this.toUpperCase() then this.toLowerCase() else this.toString()
  while true
    m = split.exec(title)
    parts.push(title.substring(index, (if m then m.index else title.length)
    ).replace(/\b([A-Za-z][a-z.'’]*)\b/g, (all) ->
      if /[A-Za-z]\.[A-Za-z]/.test(all)
        all
      else
        upper(all)
    ).replace(RegExp("\\b" + small + "\\b", "ig"), lower
    ).replace(RegExp("^" + punct + small + "\\b", "ig"), (all, punct, word) ->
      punct + upper(word)
    ).replace(RegExp("\\b" + small + punct + "$", "ig"), upper)
    )
    index = split.lastIndex
    if m
      parts.push m[0]
    else
      break
  parts.join(''
  ).replace(RegExp(" V(s?)\\. ", "ig"), " v$1. "
  ).replace(/(['’])S\b/ig, "$1s"
  ).replace(/\b(AT&T|Q&A)\b/ig, (all) ->
    all.toUpperCase()
  ).replace('&Amp;', '&amp;')

###
  Calculate Levenshtein distance between two strings  
  version: 1109.2015
  discuss at: http://phpjs.org/functions/levenshtein

  original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
  bugfixed by: Onno Marsman
  revised by: Andrea Giammarchi (http://webreflection.blogspot.com)
  reimplemented by: Brett Zamir (http://brett-zamir.me)
  reimplemented by: Alexander M Beedie
  coffee script by: David W. McKelvey (http://david.mckelveycreative.com)

  example 1: levenshtein('Kevin van Zonneveld', 'Kevin van Sommeveld');
  returns 1: 3
###

String::levenshtein = (s2) ->

  # Init
  s1 = this.toString()
  return s1.length if not s2? or typeof s2 is 'undefined'
  return 0 if s1 is s2
  s1_len = s1.length
  s2_len = s2.length if s2.length?
  return s2_len if s1_len is 0 and s2_len?
  return s1_len if not s2_len? or s2_len is 0
  
  # Split
  split = false
  try
    split = !('0')[0]
  catch e
    split = true # Earlier IE may not support access by string index
  if split
    s1 = s1.split('')
    s2 = s2.split('')
  
  # Setup
  v0 = new Array(s1_len + 1)
  v1 = new Array(s1_len + 1)
  s1_idx = 0
  s2_idx = 0
  cost = 0

  for s1_idx in [0..s1_len]
    v0[s1_idx] = s1_idx
  char_s1 = ''
  char_s2 = ''
  for s2_idx in [1..s2_len]
    v1[0] = s2_idx
    char_s2 = s2[s2_idx - 1]
    for s1_idx in [0..(s1_len - 1)]
      char_s1 = s1[s1_idx]
      cost = (if char_s1 is char_s2 then 0 else 1)
      m_min = v0[s1_idx + 1] + 1
      b = v1[s1_idx] + 1
      c = v0[s1_idx] + cost
      m_min = b if b < m_min
      m_min = c if c < m_min
      v1[s1_idx + 1] = m_min
    v_tmp = v0
    v0 = v1
    v1 = v_tmp
  v0[s1_len]

###
  Similar
  version: 1109.2015
  discuss at: http://phpjs.org/functions/similar_text

  original by: Rafał Kukawski (http://blog.kukawski.pl)
  bugfixed by: Chris McMacken
  coffee script by: David W. McKelvey (http://david.mckelveycreative.com)

  example 1: similar_text('Hello World!', 'Hello phpjs!');
  returns 1: 7
  example 2: similar_text('Hello World!', null);
  returns 2: 0
###

String::similar = (s2, percent = true) ->

  # Init
  s1 = this.toString()
  return 0 if s2 is null or typeof s2 is 'undefined'
  s2 += ''
  pos1 = 0
  pos2 = 0
  max = 0
  s1_len = s1.length
  s2_len = s2.length
  
  for p in [0..s1_len]
    for q in [0..s2_len]
      l = 0
      while p + l < s1_len and q + l < s2_len and s1.charAt(p + l) is s2.charAt(q + l)
        l += 1
        if l > max
          max = l
          pos1 = p
          pos2 = q
  sum = max
  if sum
    sum += s1.substr(0, pos2).similar(s2.substr(0, pos2), false) if pos1 and pos2
    sum += s1.substr(pos1 + max, s1_len - pos1 - max).similar(s2.substr(pos2 + max, s2_len - pos2 - max), false) if pos1 + max < s1_len and pos2 + max < s2_len
  return sum if not percent
  (sum * 200.0 / (s1_len + s2_len))

