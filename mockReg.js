//利用有限状态机模仿实现一个正则表达式test方法：/abc/.test('')
function test(string) {
    let startIndex = 0
    let endIndex = 0
    let i = 0
    function waitForA(char) {
        if(char === 'a'){
            startIndex = i
            return waitForB
        }
        return waitForA
    }

    function waitForB(char) {
        if(char === 'b'){
            return waitForC
        }else if(char === 'a'){
            startIndex = i
            return waitForB
        }
        return waitForA
    }

    function waitForC(char) {
        if(char === 'c'){
            endIndex = i
            return end
        }
        return waitForA
    }

    function end() {
        return end
    }
    let currentState = waitForA
    for (;i < string.length; i++) {
        currentState = currentState(string[i])
        if(currentState === end){
            console.log(startIndex,endIndex)
            currentState = waitForA
        }
    }
}

console.log(test('edabcrewrabc'))