// ==UserScript==
// @name	ciciogame
// @author	Eric <reallyimeric@gmail.com>
// @icon	http://en.gravatar.com/userimage/46203070/0cf34385a83b024fe00c148706ff35a6.png?size=200
// @version	0.1.0
// @description
// @include	/^http://u\d\d?\.cicihappy\.com/ogame/galaxy\.php/
// @grant none
// ==/UserScript==

'use strict'

const targetContext = window
const STOPED = 0
const RUNNING = 1
const formAction = targetContext.document.getElementById('galaxy_form').getAttribute('action')
const galaxyCode = targetContext.document.querySelector('form#galaxy_form>input[name="galaxycode"][type="hidden"]')
const positionNodelist = targetContext.document.getElementsByTagName('tbody')[1].querySelectorAll('tr>th>a[href="#"]')
const g = scanGenerator()
const dataStorage = new DataStorage()

function preconditionCheck() {
  if (!localStorage) {
    alert('你的浏览器不支持localstorage')
    return
  }
  if (!formAction || !galaxyCode || !positionNodelist) {
    alert('对方改变了玩法？')
    return
  }
  if (localStorage.getItem('scannerStatus') == RUNNING) {
    alert('另一个实例正在运行/上次的扫描被中断')
    return
  }
}

function init() {
  if (!localStorage.getItem('scannerStatus')){
    localStorage.setItem('scannerStatus', STOPED)
    localStorage.setItem('scannerGalaxy', 1)  //max 9, it's the scanner index for next time
    localStorage.setItem('scannerSystem', 1)  //max 499, it's the scanner index for next time
  }
}

function* scanGenerator() {
  let galaxy = localStorage.getItem('scannerGalaxy')
  let system = localStorage.getItem('scannerSystem')
  // if (localStorage.getItem('scannerStatus') == RUNNING) return
  localStorage.setItem('scannerStatus', RUNNING)
  let targetDocument = document
  let galaxycode
  while (galaxy != 10){
    galaxycode = targetDocument.querySelector('form#galaxy_form>input[name="galaxycode"][type="hidden"]').value
    yield scanLoop()
    if (++system === 500) system = 1,galaxy++
    localStorage.setItem('scannerGalaxy', galaxy)
    localStorage.setItem('scannerSystem', system)
  }
  localStorage.setItem('scannerStatus', STOPED)
  function scanLoop() {
    if (localStorage.getItem('scannerStatus') == RUNNING) sendQuery(galaxy, system)
    function sendQuery(galaxy, system) {
      const targetUrl = formAction
      const xhr = new XMLHttpRequest()
      const param = `&galaxycode=${galaxycode}&galaxy=${galaxy}&system=${system}`
      xhr.addEventListener('load', resultParser)
      xhr.open('POST', targetUrl)
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.overrideMimeType('text/html; charset=gbk')
      xhr.send(param)
      function resultParser(evt) {
        evt
        const parser = new DOMParser()
        const resultDocument = parser.parseFromString(xhr.responseText, 'text/html')
        // alert(resultDocument.characterSet)
        console.log(resultDocument.getElementById('galaxy_form').galaxycode.value)
        targetDocument = resultDocument
        const possiableNodeList = resultDocument.getElementsByTagName('tbody')[1].querySelectorAll('tr>th>a[href="#"]')
        Array.from(possiableNodeList).forEach(el => {
          if (el.text > 0 && el.text < 16) {
            const planet = el.parentNode.parentNode.getElementsByTagName('th')[0].querySelector('a').text
            const playerNameAnchor = el.parentNode.parentNode.getElementsByTagName('th')[5].querySelector('a')
            const player = playerNameAnchor ? playerNameAnchor.text : ''
            // alert(`${el.text} ${player}`)
            const position = `${galaxy}:${system}:${planet}`
            dataStorage.set(position, player)
          } else {
            alert('页面发生了改动？无论怎样，现在你应该停止脚本的运行')
          }
        })
        g.next()
      }
    }
  }
}

function downloadData() {
  const parts = dataStorage.getAll()
  const blob = new Blob(parts, { 'type': 'text/json' })
  const a = document.createElement('a')
  const url = window.URL.createObjectURL(blob)
  const filename = 'result.json'
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function DataStorage() {
  this.get = position => localStorage.getItem(position)
  this.set = (position, player) => localStorage.setItem(position, player)
  this.getAll = () => {
    let result = []
    for (let i = 0; i != 10; i++)
      for (let j = 0; j != 500; j++)
        for (let k = 1; k != 16; k++){
          const position = `${i}:${j}:${k}`
          const player = this.get(position)
          const o = {
            position: position,
            player: player
          }
          result.push(JSON.stringify(o))
        }
    return result
  }
  this.clear = () => localStorage.clear()
}

function main(){
  preconditionCheck()
  init()
  g.next()
}

main()