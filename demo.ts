import { htmlParser as shtmlParser } from './src/lib/ZhtmlParser'

const html = `<z:if condtion="index != 1">
  <div>
</z:if>
<z:else>
  <div class="class2">
</z:else>
<span>asdf</span>
</div>`

console.log()
const parsed = shtmlParser(html)
console.log('zhtml-parser解析后再转回为字符串')
console.log(parsed)
console.log()
