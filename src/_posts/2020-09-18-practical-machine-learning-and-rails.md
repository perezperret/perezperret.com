---
layout: post
title: Practical Machine Learning and Rails
date: 2020-09-18T03:00:00Z
author: Santiago
permalink: "/practical-machine-learning-and-rails"
excerpt: How I built a Machine Learning workflow to integrate with a Ruby on Rails
  app
categories:
- Python
- Ruby on Rails
- Machine learning
- Technology

---
I've been going through the Machine Learning Engineer track on [DataCamp](https://www.datacamp.com/), and I've enjoyed it a lot. It is convenient and a bit repetitive but in the right way because it has been constructive to do things a few times (maybe because I'm getting old). On the downside, all the courses and projects are done within their hosted editor and programming environment, so I felt I was still missing some practical knowledge.

On the other hand, I've been building [PocketPatch](https://pocketpatch.io) on my spare time for the past year or so, and I've built up a nice dataset (of my own expenses) I thought I might experiment on a bit. The app uses [Plaid](plaid.com) to collect transaction data and then lets users categorize them as they see fit. Part of my proposal is that you should use your own categories to classify your expenses instead of standardized ones. So some users might choose to lump all food expenses into a "Food" category, and others might split them between "Eating out" and "Groceries."

The problem here, as you might have noticed, if you pay attention to your bank app's expense tracking features, is that the categories provided by points of sale are rarely accurate, let alone specific. PocketPatch manages this by putting all new transactions in an inbox where you can review and fix their categories. Going through this step is a bit of a speed bump, but it ensures the data you're tracking is high-quality. It also has the added benefit of building awareness about your spending patterns. If you make an effort to review your transactions a couple of times a week, you'll be more able to react to harmful habits and have your targets more present.

Ideally, only a few of the transactions would need editing in the inbox, but the reality is that most of them do. The silver lining is that this is a very approachable Machine Learning problem for a beginner like me. I've been tracking my expenses for about three months using the tool. I have built up around 300 entries, where I have a very well defined mapping of transaction description to the personalized category, so I decided to give it a try as the learning project I was looking for, and then maybe incorporate it into PocketPatch. Let's dive into it.

## 1. Following the guides

Since this is such a typical problem, there was an [excellent example](https://scikit-learn.org/stable/tutorial/text_analytics/working_with_text_data.html) in ScikitLearn's guides, so I went through that first to get a good feel for what I needed to do. ScikitLearn, aka sklearn, is one of the better known Machine Learning libraries for Python, and what I've been using on the DataCamp courses. It was easy to follow the example using [Google's Colab Notebooks](https://colab.research.google.com/), which are also a very nice tool (I wish I could find a non-Google option though, so please get in touch if you know of any alternatives).

Going through the example gave me a good feeling that I could achieve something useful without too much complexity.

## 2. Extracting the data

PocketPatch is a Ruby on Rails app, and it already has a CSV export feature, meant for users to be able to download their data if they want. Still, it was useful (with a couple of tweaks I put behind a feature flag) to export the dataset as needed for this exercise: basically the transaction description and the user's personalized category, which will be the target for the prediction.

Right now, using only the description is giving me good enough results, but down the line, I can imagine using the bank-assigned category and the amount range as features too.

## 3. Fitting the model

I tweaked the code from the guides I mentioned before to run for my data, and it got me a decent accuracy without much tuning. It was fascinating to see the test data categorized, and most of the selected categories make sense.

I put all the code [in this notebook](https://colab.research.google.com/drive/1aIfmNkaZ2av8J8GKhWcu2LG-GM-0kgPf?usp=sharing) with more detailed explanations. It is a very standard pipeline per the courses I've taken:

1. Read in the dataset from the exported CSV file into a pandas. `DataFrame`.
2. Define the feature-set (`X`), which is the part of the data that helps make the prediction. You might as well call it the input. In this case, only the transaction description (at least for now)
3. Defines the target labels (`y`), which are the expected results from those known inputs.
4. Creates a train-test split (part of the data set is left out from the training to see how the model performs on data it hasn't seen).
5. Transforms the input into count vectors: for the model to understand the input, it needs to be in the form of numerical values, so first, we transform the descriptions into word counts.
6. Then we transform these word counts into frequencies, which makes them more meaningful for the classifier using [`tifd`](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html).
7. Fit the model.
8. Evaluate the accuracy.

I'm basically copying the tutorial, and I'm already getting around 60% accuracy. What's more, I'm getting probabilities, which are helpful to suggest alternatives if the category is off. I'm sure I can come back to this and make the model even better, but first, I wanted to make sure I could deploy it and use it in a way that is simple enough to be worthwhile.

## 4. Designing the API

What is a bit non-standard about my workflow is that I want to fit a model for each user in the app (I hope this doesn't bite me), so the API has three endpoints:

1. Store a CSV file for the model to use,
2. Take the name of a CSV file, a user ID, and a webhook URL, fit the model with the contents of the CSV file, store it with a unique ID, and notify the webhook with the user ID and the model ID.
3. Take a model ID and an array of descriptions and predict their categories using the model.

The first endpoint is provided for free by the service I used, and you can see the code for the fitting and prediction steps [here](https://github.com/perezperret/plaid_transactions_classifier).

## 5. Deploying it

PocketPatch is a Ruby on Rails app, and the Machine Learning code is in Python. I know I could probably find a way to run Python from Ruby but just saying that feels wrong. Plus, since this is very experimental, I don't want to mangle it with the rest of the app. I'm a sucker for code quality, and I've made a huge effort to keep the codebase smooth.

I've also been using a lot of FaaS (functions as a service) lately and have particularly enjoyed Vercel's version. Still, there is a limitation I couldn't get around: fitting the model is quite intensive, so I don't want to wait for an HTTP response, and there is no async invocation in Vercel. Since there is one model per user, I need the fitting step to be part of the API.

So? [Algorithmia](https://algorithmia.com/) to the rescue: it offers a straightforward way to host Machine Learning workflows where you write a Python module, which exposes an `apply`  function that runs your algorithm, and they'll run it and scale it for you. You can call these asynchronously by setting `output: “void”` , so it works for my requirement.

The only downsides were that I had to host the code in two separate repos: one for the fitting step, and one for the prediction. Running the algorithms locally required writing some glue code, and I couldn't figure out how to add environment variables, which would've been handy. So the experience is a bit raw, but the simplicity almost entirely makes up for it.

On the bright side, they have a nice and simple API for storing files, which is quite useful for Machine Learning problems, and made it even easier to implement my desired API.

I'm exposing the code on a [GitHub Repo](https://github.com/perezperret/plaid_transactions_classifier) instead of Algorithmia (which offers an option to make the algorithm public) because I'm not sure I'm sandboxing the data correctly. But you can see that on a few lines of code, I've built and deployed my API.

## 7. Integrating with PocketPatch

I haven't done this yet (I have a big backlog!), but I tried Algorithmia's Ruby SDK, and it worked well. So in terms of the API, I defined earlier:

1. I already have the CSV export logic in place on the Rails app. Now I need it to use Algorithmia's data store (my "Save file" endpoint) instead of my [Digital Ocean Spaces](https://www.digitalocean.com/products/spaces/) bucket to share the training data.
2. I need to set up a job to save an export and call the "Fit model" endpoint periodically to keep the models up to date.
3. I have to set up a webhook handling endpoint to store the model's ID for each user.
4. And then start pre-classifying the transactions as they come in from Plaid using the "Predict" endpoint.

If something interesting comes up while doing this, I'll write a follow-up!

***

The workflow I walked you through is a straightforward example and is still an experimental feature, but it is undoubtedly going to make PocketPatch much better if it works. I can't believe that in a week's worth of side-project work, I could achieve this, using a language I'm not very comfortable with yet. It is exciting how the functions as a service idea and the popularization of Machine Learning is empowering us, developers, to move beyond our comfort zone and create value in new ways!