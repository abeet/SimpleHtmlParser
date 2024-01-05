/*
 HTML 结构检查
---------------
  参考 Nochum Sossonko, (nsossonko@hotmail.com) Einar Lielmanis, <elfz@laacz.lv> 的 style_html(html_source);
*/
// Wrapper function to invoke all the necessary constructors and deal with the output.

class Parser {
  pos: number
  lineNumber: number
  token: string
  current_mode: string
  tags: {
    // An object to hold tags, their position, and their parent-tags, initiated with default values
    parent: string
    parent_count: number
    parent1: string
  }

  tag_type: string
  token_text: string
  last_token: string
  last_text: string
  token_type: string
  Utils: {
    // Uilities made available to the various functions
    whitespace: string[]
    single_token: string
  }

  input: string
  output: any[]
  indent_level: any
  message: any

  constructor() {
    this.pos = 0 // Parser position
    this.lineNumber = 1 // Parser position
    this.token = ''
    this.current_mode = 'CONTENT' // reflects the current Parser mode: TAG/CONTENT
    this.tags = {
      // An object to hold tags, their position, and their parent-tags, initiated with default values
      parent: 'parent1',
      parent_count: 1,
      parent1: ''
    }
    this.tag_type = ''
    this.token_text = this.last_token = this.last_text = this.token_type = ''

    this.Utils = {
      // Uilities made available to the various functions
      whitespace: '\n\r\t '.split(''),
      single_token:
        ',br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,'
      // all the single tags for HTML
    }
  }

  get_content() {
    // function to capture regular content between tags
    let input_char = ''
    const content: string[] = []
    while (this.input.charAt(this.pos) !== '<') {
      if (this.pos >= this.input.length) {
        return content.length ? content.join('') : ['', 'TK_EOF']
      }
      input_char = this.input.charAt(this.pos)
      if (input_char === '\n') {
        this.lineNumber++
      }
      this.pos++

      // if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
      // }
      content.push(input_char) // letter at-a-time (or string) inserted to an array
    }
    return content.length ? content.join('') : ''
  }

  get_script() {
    // get the full content of a script
    let input_char = ''
    const content: string[] = []
    const reg_match = new RegExp('</script' + '>', 'igm')
    reg_match.lastIndex = this.pos
    const reg_array = reg_match.exec(this.input)
    const end_script = reg_array ? reg_array.index : this.input.length // absolute end of script
    while (this.pos < end_script) {
      // get everything in between the script tags
      if (this.pos >= this.input.length) {
        return content.length ? content.join('') : ['', 'TK_EOF']
      }

      input_char = this.input.charAt(this.pos)
      if (input_char === '\n') {
        this.lineNumber++
      }
      this.pos++

      content.push(input_char)
    }
    return content.length ? content.join('') : '' // we might not have any content at all
  }

  record_tag(tag) {
    // function to record a tag and its parent in this.tags Object
    if (this.tags[`${tag}_count`]) {
      // check for the existence of this tag type
      this.tags[`${tag}_count`]++
      this.tags[tag + this.tags[`${tag}_count`]] = this.indent_level // and record the present indent level
    } else {
      // otherwise initialize this tag type
      this.tags[`${tag}_count`] = 1
      this.tags[tag + this.tags[`${tag}_count`]] = this.indent_level // and record the present indent level
    }
    this.tags[`${tag + this.tags[`${tag}_count`]}_parent`] = this.tags.parent // set the parent (i.e. in the case of a div this.tags.div1parent)
    this.tags.parent = tag + this.tags[`${tag}_count`] // and make this the current parent (i.e. in the case of a div 'div1')
  }

  retrieve_tag(tag) {
    // function to retrieve the opening tag to the corresponding closer
    if (this.tags[`${tag}_count`]) {
      // if the openener is not in the Object we ignore it
      let temp_parent = this.tags.parent // check to see if it's a closable tag.
      while (temp_parent) {
        // till we reach '' (the initial value);
        if (tag + this.tags[`${tag}_count`] === temp_parent) {
          // if this is it use it
          break
        }
        this.message.push(`行${this.lineNumber} 缺失的结束标签 /${temp_parent}`)
        temp_parent = this.tags[`${temp_parent}_parent`] // otherwise keep on climbing up the DOM Tree
      }
      if (temp_parent) {
        // if we caught something
        this.indent_level = this.tags[tag + this.tags[`${tag}_count`]] // set the indent_level accordingly
        this.tags.parent = this.tags[`${temp_parent}_parent`] // and set the current parent
      }
      delete this.tags[`${tag + this.tags[`${tag}_count`]}_parent`] // delete the closed tags parent reference...
      delete this.tags[tag + this.tags[`${tag}_count`]] // ...and the tag itself
      if (this.tags[`${tag}_count`] === 1) {
        delete this.tags[`${tag}_count`]
      } else {
        this.tags[`${tag}_count`]--
      }
    } else {
      if (!this.Utils.single_token.includes(`,${tag},`)) {
        this.message.push(`行${this.lineNumber} 多余的结束标签 ${tag}`)
      }
    }
  }

  get_tag() {
    // function to get a full tag and parse its type
    let input_char = ''
    const content: string[] = []

    do {
      if (this.pos >= this.input.length) {
        return content.length ? content.join('') : ['', 'TK_EOF']
      }

      input_char = this.input.charAt(this.pos)
      if (input_char === '\n') {
        this.lineNumber++
      }
      this.pos++

      if (input_char === "'" || input_char === '"') {
        if (!content[1] || content[1] !== '!') {
          // if we're in a comment strings don't get treated specially
          input_char += this.get_unformatted(input_char)
        }
      }

      content.push(input_char) // inserts character at-a-time (or string)
    } while (input_char !== '>')

    const tag_complete = content.join('')
    let tag_index = 0
    while ((input_char = tag_complete.charAt(tag_index))) {
      // 标签开始后后面接的可能是换行符回车符
      if (
        input_char === ' ' ||
        input_char === '\n' ||
        input_char === '\r' ||
        input_char === '\t' ||
        input_char === '>'
      ) {
        break
      }
      tag_index++
    }
    const tag_check = tag_complete.substring(1, tag_index).toLowerCase()

    if (
      tag_complete.charAt(tag_complete.length - 2) === '/' ||
      this.Utils.single_token.includes(`,${tag_check},`)
    ) {
      // if this tag name is a single tag type (either in the list or has a closing /)
      this.tag_type = 'SINGLE'
    } else if (tag_check === 'script') {
      // for later script handling
      this.record_tag(tag_check)
      this.tag_type = 'SCRIPT'
    } else if (tag_check === 'style') {
      // for future style handling (for now it justs uses get_content)
      this.record_tag(tag_check)
      this.tag_type = 'STYLE'
    } else if (tag_check.charAt(0) === '!') {
      // peek for <!-- comment
      if (tag_check.includes('[if')) {
        // peek for <!--[if conditional comment
        if (tag_complete.includes('!IE')) {
          // this type needs a closing --> so...
          const comment = this.get_unformatted('-->', tag_complete) // ...delegate to get_unformatted
          content.push(comment)
        }
        this.tag_type = 'START'
      } else if (tag_check.includes('[endif')) {
        // peek for <!--[endif end conditional comment
        this.tag_type = 'END'
        this.unindent()
      } else if (tag_check.includes('[cdata[')) {
        // if it's a <[cdata[ comment...
        const comment = this.get_unformatted(']]>', tag_complete) // ...delegate to get_unformatted function
        content.push(comment)
        this.tag_type = 'SINGLE' // <![CDATA[ comments are treated like single tags
      } else {
        const comment = this.get_unformatted('-->', tag_complete)
        content.push(comment)
        this.tag_type = 'SINGLE'
      }
    } else {
      if (tag_check.charAt(0) === '/') {
        // this tag is a double tag so check for tag-ending
        this.retrieve_tag(tag_check.substring(1)) // remove it and all ancestors
        this.tag_type = 'END'
      } else {
        // otherwise it's a start-tag
        this.record_tag(tag_check) // push it on the tag stack
        this.tag_type = 'START'
      }
    }
    return content.join('') // returns fully formatted tag
  }

  get_unformatted(delimiter, orig_tag?) {
    // function to return unformatted content in its entirety
    if (orig_tag && orig_tag.includes(delimiter)) {
      return ''
    }
    let input_char = ''
    let content = ''
    do {
      input_char = this.input.charAt(this.pos)
      if (input_char === '\n') {
        this.lineNumber++
      }
      this.pos++

      content += input_char
    } while (!content.includes(delimiter) && this.pos < this.input.length)
    return content
  }

  get_token() {
    // initial handler for token-retrieval
    let token

    if (this.last_token === 'TK_TAG_SCRIPT') {
      // check if we need to format javascript
      const js_source_text = this.get_script()
      if (typeof js_source_text !== 'string') {
        return js_source_text
      }
      token = js_source_text
      return [token, 'TK_CONTENT']
    }
    if (this.current_mode === 'CONTENT') {
      token = this.get_content()
      if (typeof token !== 'string') {
        return token
      } else {
        return [token, 'TK_CONTENT']
      }
    }

    if (this.current_mode === 'TAG') {
      token = this.get_tag()
      if (typeof token !== 'string') {
        return token
      } else {
        const tag_name_type = `TK_TAG_${this.tag_type}`
        return [token, tag_name_type]
      }
    }
  }

  indent() {
    this.indent_level++
  }

  unindent() {
    if (this.indent_level > 0) {
      this.indent_level--
    }
  }
}

/* _____________________--------------------_____________________ */
let multi_parser: Parser

export function htmlParser(html_source: string) {
  multi_parser = new Parser() // wrapping functions Parser
  multi_parser.input = html_source
  multi_parser.indent_level = 0
  multi_parser.output = []
  multi_parser.message = []

  while (true) {
    const t = multi_parser.get_token()
    multi_parser.token_text = t[0]
    multi_parser.token_type = t[1]

    if (multi_parser.token_type === 'TK_EOF') {
      break
    }
    multi_parser.output.push(t)
    switch (multi_parser.token_type) {
      case 'TK_TAG_START':
      case 'TK_TAG_SCRIPT':
      case 'TK_TAG_STYLE':
        multi_parser.indent()
        multi_parser.current_mode = 'CONTENT'
        break
      case 'TK_TAG_END':
        multi_parser.current_mode = 'CONTENT'
        break
      case 'TK_TAG_SINGLE':
        multi_parser.current_mode = 'CONTENT'
        break
      case 'TK_CONTENT':
        multi_parser.current_mode = 'TAG'
        break
    }
    multi_parser.last_token = multi_parser.token_type
    multi_parser.last_text = multi_parser.token_text
  }
  if (multi_parser.tags.parent !== 'parent1') {
    multi_parser.message.push(
      `行${multi_parser.lineNumber} 缺失的结束标签 /${multi_parser.tags.parent}`
    )
  }
  if (multi_parser.message.length) {
    console.warn(...multi_parser.message)
  }
  return multi_parser
}
