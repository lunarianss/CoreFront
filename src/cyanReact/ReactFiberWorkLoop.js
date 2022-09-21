import {
  updateClassComponent,
  updateFunctionComponent,
  updateHostComponent,
} from "./ReactFiberConceil";
import { isFn, isString } from "./util";

// 根节点: div#app
let wipRoot = null;

// 当前正在被conceil和peform的节点
let nextUnitWork = null;

export function scheduleUpdateOnFiber(fiber) {
  wipRoot = fiber;
  wipRoot.sibling = null;
  nextUnitWork = wipRoot;
}

// 形成fiber结构的时候是按照 self -> child -> sibling的结构去深度优先遍历的
export function performUnitOfWork(wip) {
  const { type } = wip;
  // console.log(wip, "wip");
  // self
  if (isString(type)) {
    updateHostComponent(wip);
  } else if (isFn(type)) {
    if (wip.flag) {
      updateClassComponent(wip);
    } else {
      updateFunctionComponent(wip);
    }
  }
  // 返回下一个更新的fiber
  // child
  if (wip.child) {
    return wip.child;
  }

  // sibling 如果当前wip没有sibling了，去父亲Fiber 也就是returnFiber上去找sibling
  let next = wip;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.return;
  }
  return null;
}

export function workLoop(IdleDeadline) {
  while (nextUnitWork && IdleDeadline.timeRemaining() > 0) {
    nextUnitWork = performUnitOfWork(nextUnitWork);
  }
  if (!nextUnitWork && wipRoot) {
    // 提交
    commitRoot();
  }
}

// 寻找父节点
function getParentNode(fiber) {
  let next = fiber.return;
  // 这里就是在判断函数式组件的时候，函数式组件的子节点应该挂载到函数式组件的父节点上(return)
  if (!next.stateNode) {
    next = next.return;
  }
  return next.stateNode;
}

function commitWorker(fiber) {
  if (!fiber) return;
  const { stateNode } = fiber;
  let parent = getParentNode(fiber);
  // updateFunctionComponent 没有挂载stateNode属性， updateHostComponet 会挂载stateNode属性
  if (stateNode) parent.appendChild(stateNode);
  // commit child
  commitWorker(fiber.child);
  // commit sibling
  commitWorker(fiber.sibling);
}

// 提交
function commitRoot() {
  commitWorker(wipRoot.child);
}

requestIdleCallback(workLoop);
