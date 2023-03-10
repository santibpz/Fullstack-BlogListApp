const jwt = require('jsonwebtoken');
const {SECRET} = require('../utils/config')
const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')


blogsRouter.get('/', async (request, response, next) => {
   try {
    const blogs = await Blog.find({})
    .populate('user', {username : 1, name: 1})
    
    response.json(blogs)
   } catch(exception) {
    next(exception)
   }
    
  })

  blogsRouter.post('/', async (request, response, next) => {
    
    const body = request.body
    try {
    const decodedToken = jwt.verify(request.token, SECRET) // request.token is set before via a tokenExtractor middleware
      const user = await User.findById(decodedToken.id)
      console.log("user", user)
      try {
        const blog = new Blog({
          title: body.title,
          author: body.author, 
          url: body.url,
          likes: body.likes, 
          user: user._id
        })
        if(!blog.likes) blog.likes = 0
        else if(!(blog.title && blog.url)) return response.status(400).send({error: "missing title or url"})
        
        
        const savedBlog = await blog.save()
        user.blogs = user.blogs.concat(savedBlog._id)
        await user.save()
        
        return response.status(201).json(savedBlog)

      } catch(exception) {
        next(exception)
      }
    } catch(error) {
      next(error)
    }
            
  })


  blogsRouter.put('/:id', async (request, response, next) => {
    const receivedBlog = request.body
    
    try {
      const decodedToken = jwt.verify(request.token, SECRET)

      const blog = await Blog.findById(request.params.id)
      const user = await User.findById(decodedToken.id)

      const updatedBlog = {
        ...receivedBlog,
        user: blog.user,
        userLikes: blog.userLikes.concat(user._id)
      }
      
      await Blog.findByIdAndUpdate(request.params.id, updatedBlog, { new:true })

      response.status(200).json(updatedBlog)

    } catch(err) {
      next(err)
    }
      
    
    
  })

  blogsRouter.delete('/:id', async (request, response, next) => {
       try {
         const decodedToken = jwt.verify(request.token, SECRET)
         const blog = await Blog.findById(request.params.id)
         
          if((blog.user.toString() === decodedToken.id)) { // if id of the user equals id of the user field in the blog
            try {
              await Blog.findByIdAndRemove(request.params.id)
              return response.status(204).end()
            } catch(exception) {
               next(exception)
            }
          } else return response.status(400).json({error: 'you do not have permission to delete this blog'})
       } catch(error) {
        next(error)
       }
       
  })

  module.exports = blogsRouter