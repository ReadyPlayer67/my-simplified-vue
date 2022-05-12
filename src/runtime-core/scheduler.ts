const queue:any[] = []
const p = Promise.resolve()
//设置一个标记，代表队列是否在刷新，即微任务是否已经创建并推入到微任务队列中
let isFlushPending = false
export function queueJobs(job){
    if(!queue.includes(job)){
        queue.push(job)
    }
    queueFlush()
}

//通过再创建一个微任务，新的微任务被推到微任务队列中
//等待前一个微任务，也就是渲染视图执行完之后再执行，在这里就能拿到最新的视图了
export function nextTick(fn){
    //如果用户传入回调函数fn，就在promise.then之后执行fn，否则就返回promise，让用户await
    return fn ? p.then(fn) : p
}

function queueFlush(){
    //因为微任务只需要创建一次，所以用标记避免创建重复的微任务
    if(isFlushPending) return
    isFlushPending = true
    //利用微任务，promise.then会在所有同步代码执行完之后再去执行
    //所以instance.update会在所有同步代码执行完之后再执行
    nextTick(flushJobs)
}

function flushJobs(){
    console.log('microtask...')
    let job
    //从前往后遍历queue，执行里面的job（模拟队列先进先出）
    while (job = queue.shift()){
        job && job()
    }
    //最后执行了微任务以后将标记重置
    isFlushPending = false
}
