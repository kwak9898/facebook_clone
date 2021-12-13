const express = require('express')
const fs = require('fs')
const router = express.Router()
const Posts = require('../schemas/posts')
const Comments = require('../schemas/comments')
const jwt = require('jsonwebtoken')
const path = require('path');
const authMiddleware = require('../middlewares/auth-middleware')
const multer = require('multer')

// 이미지파일 처리
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/");
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, path.basename(file.originalname, ext) + "-" + Date.now() + ext);
    }
});

var upload = multer({ storage: storage});

// 메인페이지 모든 포스팅 보여주기
router.get('/post', async (req, res) => {
    const Post = await Posts.find({}).sort('-postId')
    res.json(Post)
})

// 게시글 업로드
router.post('/post', authMiddleware, upload.single('img'), async (req, res) => {
    // console.log(req.file)
    const { userId, userName } = res.locals.user
    const { content } = req.body
    const likeCnt = 0
    const createAt = new Date(+new Date() + 3240 * 10000)
        .toISOString()
        .replace('T', ' ')
        .replace(/\..*/, '')
    let img = `/images/${req.file.filename}`
    console.log('img_url' + img)
    let postId = await Posts.find({}).sort('-postId').limit(1)
    if (postId.length == 0) {
        postId = 1
    } // 검색결과가 없으면 postId를 1로 설정
    else {
        postId = postId[0]['postId'] + 1
    } //검색결과가 있으면 결과의 postId + 1 로 설정
    await Posts.create({
        postId,
        userId,
        userName,
        img,
        content,
        createAt,
        likeCnt,
    })

    res.send({ result: 'success' })
})
// 게시글 수정페이지 로딩

router.get("/modify/:postId", async (req, res, next) => {
    try {
        const { postId } = req.params;
        const post = await Posts.findOne({ postId }).exec();
        res.json({ ...post });
    } catch (err) {
        console.error(err)
        res.status(400).send({
            errorMessage: err,
        })
    }
});
// 게시글 수정
router.put(
    '/modify/:postId',
    authMiddleware,
    upload.single('img'),
    async (req, res, next) => {
        try {
            const { userId,userName } = res.locals.user
            const { content } = req.body
            const { postId } = req.params
            const img = `/images/${req.file.filename}`

            const existId = await Posts.findOne({ postId, userId })
            if (existId.length !== 0) {
                await Posts.updateOne(
                    { postId },
                    {
                        $set: {
                            postId,
                            userId,
                            userName,
                            content,
                            img,
                            createAt: existId.createAt,
                            likeCnt: existId.likeCnt,
                        },
                    }
                )
                fs.unlink(`public${existId.img}`, (err)=>{
                    if(err){
                        console.log(err)
                        return
                    }
                })
                res.send({ result: 'success' })
            }
        } catch (err) {
            console.error(err)
            res.status(400).send({
                errorMessage: err,
            })
        }
    }
)

// 게시글 삭제하기
router.delete('/post/:postId', authMiddleware, async (req, res) => {
    try {
        const { postId } = req.params
        const { userId } = res.locals.user
        console.log(1)
        const postsExist = await Posts.findOne({ postId, userId })
        console.log(2)
        const commentsExist = await Comments.findOne({ postId })
        console.log(3)
        if (postsExist && commentsExist) {
            await Comments.deleteMany({ postId })
            await Posts.deleteOne({ postId })
            fs.unlink(`public${postsExist.img}`, (err)=>{
                if(err){
                    console.log(err)
                    return
                }
            })
            res.send({ result: 'success' })
        } else if (postsExist) {
            await Posts.deleteOne({ postId })
            fs.unlink(`public${postsExist.img}`, (err)=>{
                if(err){
                    console.log(err)
                    return
                }
            })
            
            res.send({ result: 'success' })
        } else {
            res.send({ result: 'fail' })
        }
    } catch (err) { }
})
module.exports = router
