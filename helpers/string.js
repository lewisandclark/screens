(function() {
  /*
    Title Caps
  
    Ported to CoffeeScript By David McKelvey - http://david.mckelveycreative.com/ - 10 October 2011
      (modified to handle all caps)
    Ported to JavaScript By John Resig - http://ejohn.org/ - 21 May 2008
    Original by John Gruber - http://daringfireball.net/ - 10 May 2008
    License: http://www.opensource.org/licenses/mit-license.php
  */
  var lower, punct, small, upper;
  small = "(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)";
  punct = "([!\"#$%&'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)";
  lower = function(word) {
    return word.toLowerCase();
  };
  upper = function(word) {
    return word.substr(0, 1).toUpperCase() + word.substr(1);
  };
  String.prototype.toTitleCaps = function() {
    var index, m, parts, split, title;
    parts = [];
    split = /[:.;?!] |(?: |^)["“]/g;
    index = 0;
    title = this.toString() === this.toUpperCase() ? this.toLowerCase() : this.toString();
    while (true) {
      m = split.exec(title);
      parts.push(title.substring(index, (m ? m.index : title.length)).replace(/\b([A-Za-z][a-z.'’]*)\b/g, function(all) {
        if (/[A-Za-z]\.[A-Za-z]/.test(all)) {
          return all;
        } else {
          return upper(all);
        }
      }).replace(RegExp("\\b" + small + "\\b", "ig"), lower).replace(RegExp("^" + punct + small + "\\b", "ig"), function(all, punct, word) {
        return punct + upper(word);
      }).replace(RegExp("\\b" + small + punct + "$", "ig"), upper));
      index = split.lastIndex;
      if (m) {
        parts.push(m[0]);
      } else {
        break;
      }
    }
    return parts.join('').replace(RegExp(" V(s?)\\. ", "ig"), " v$1. ").replace(/(['’])S\b/ig, "$1s").replace(/\b(AT&T|Q&A)\b/ig, function(all) {
      return all.toUpperCase();
    }).replace('&Amp;', '&amp;');
  };
  /*
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
  */
  String.prototype.levenshtein = function(s2) {
    var b, c, char_s1, char_s2, cost, m_min, s1, s1_idx, s1_len, s2_idx, s2_len, split, v0, v1, v_tmp, _ref;
    s1 = this.toString();
    if (!(s2 != null) || typeof s2 === 'undefined') {
      return s1.length;
    }
    if (s1 === s2) {
      return 0;
    }
    s1_len = s1.length;
    if (s2.length != null) {
      s2_len = s2.length;
    }
    if (s1_len === 0 && (s2_len != null)) {
      return s2_len;
    }
    if (!(s2_len != null) || s2_len === 0) {
      return s1_len;
    }
    split = false;
    try {
      split = !'0'[0];
    } catch (e) {
      split = true;
    }
    if (split) {
      s1 = s1.split('');
      s2 = s2.split('');
    }
    v0 = new Array(s1_len + 1);
    v1 = new Array(s1_len + 1);
    s1_idx = 0;
    s2_idx = 0;
    cost = 0;
    for (s1_idx = 0; 0 <= s1_len ? s1_idx <= s1_len : s1_idx >= s1_len; 0 <= s1_len ? s1_idx++ : s1_idx--) {
      v0[s1_idx] = s1_idx;
    }
    char_s1 = '';
    char_s2 = '';
    for (s2_idx = 1; 1 <= s2_len ? s2_idx <= s2_len : s2_idx >= s2_len; 1 <= s2_len ? s2_idx++ : s2_idx--) {
      v1[0] = s2_idx;
      char_s2 = s2[s2_idx - 1];
      for (s1_idx = 0, _ref = s1_len - 1; 0 <= _ref ? s1_idx <= _ref : s1_idx >= _ref; 0 <= _ref ? s1_idx++ : s1_idx--) {
        char_s1 = s1[s1_idx];
        cost = (char_s1 === char_s2 ? 0 : 1);
        m_min = v0[s1_idx + 1] + 1;
        b = v1[s1_idx] + 1;
        c = v0[s1_idx] + cost;
        if (b < m_min) {
          m_min = b;
        }
        if (c < m_min) {
          m_min = c;
        }
        v1[s1_idx + 1] = m_min;
      }
      v_tmp = v0;
      v0 = v1;
      v1 = v_tmp;
    }
    return v0[s1_len];
  };
  /*
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
  */
  String.prototype.similar = function(s2, percent) {
    var l, max, p, pos1, pos2, q, s1, s1_len, s2_len, sum;
    if (percent == null) {
      percent = true;
    }
    s1 = this.toString();
    if (s2 === null || typeof s2 === 'undefined') {
      return 0;
    }
    s2 += '';
    pos1 = 0;
    pos2 = 0;
    max = 0;
    s1_len = s1.length;
    s2_len = s2.length;
    for (p = 0; 0 <= s1_len ? p <= s1_len : p >= s1_len; 0 <= s1_len ? p++ : p--) {
      for (q = 0; 0 <= s2_len ? q <= s2_len : q >= s2_len; 0 <= s2_len ? q++ : q--) {
        l = 0;
        while (p + l < s1_len && q + l < s2_len && s1.charAt(p + l) === s2.charAt(q + l)) {
          l += 1;
          if (l > max) {
            max = l;
            pos1 = p;
            pos2 = q;
          }
        }
      }
    }
    sum = max;
    if (sum) {
      if (pos1 && pos2) {
        sum += s1.substr(0, pos2).similar(s2.substr(0, pos2), false);
      }
      if (pos1 + max < s1_len && pos2 + max < s2_len) {
        sum += s1.substr(pos1 + max, s1_len - pos1 - max).similar(s2.substr(pos2 + max, s2_len - pos2 - max), false);
      }
    }
    if (!percent) {
      return sum;
    }
    return sum * 200.0 / (s1_len + s2_len);
  };
}).call(this);
