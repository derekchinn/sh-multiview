define(["streamhub-sdk/jquery", "inherits", "stream", "streamhub-sdk/view"],
function ($, inherits, Stream, View) {
    "use strict";
    
    var MultiView = function (opts, streams) {
        View.call(this, opts);

        opts = opts || {};
        streams = streams || [];
        
        this.startOn = opts.startOn;
        this._createView = opts.createView;
        this._active = {};
        this._streams = [];
        this._views = {};
        this._callback = opts.callback || function () {};
        this._init(streams);
    };
    inherits(MultiView, View);
    
    MultiView.prototype._init = function (streams) {
        for (var i = 0, len = streams.length; i < len; i++) {
            var stream = streams[i];
            var view = this._buildView(stream);
            if (typeof this.startOn == "undefined" && i == 0 ||
                this.startOn === stream.articleId) {
                this._startStream(stream, view);
            }
            else {
                this._queueStream(stream, view);
            }
        }
        
        this._callback.call(this);
        return this;
    };
    
    MultiView.prototype._startStream = function (stream, view, fakeStart) {
        var s;
        /*
         * TODO: This might be a bad assumption? Vet it
         * The assumption is if you pass a view, you want to pipe a 
         * stream to it...so that means we've never seen you before.
         */
        if (view) {
            s = stream;
            s.pipe(view);
            this._streams.push(s);
            if (!fakeStart) {
                this._active.stream = s;
                this._active.view = view;
                this.el.appendChild(view.el);
            }
        }
        
        /*
         * I've seen you before... let's go find you.
         */
        else {
            this._active.stream.pause();
            s = this._streams[this._streams.indexOf(stream)];
            s.resume();
            this._active.stream = s;
            this._active.view = this._views[s.articleId];
        }
        
        /*
         * Kinda ghetto.. but force the view to fit the el width
         */
        $(window).trigger("resize");
        return s;
    };
    
    MultiView.prototype._queueStream = function (stream, view) {
        var s = this._startStream(stream, view, true);

        /*
         * Have to do start first THEN pause it... it should prevent it
         * from running since the pipe - which inherently calls read - is called
         * on the next tick while pause it "run" immediately
         */
        s.pause();
    };
    
    MultiView.prototype._createElement = function (parentEl, type, attributes) {
        var newEl = document.createElement(type);
        
        //TODO: Change this to just use a for-loop
        if (attributes.id) {
            newEl.setAttribute("id", attributes.id);
        }
        
        return parentEl.appendChild(newEl);
    };

    MultiView.prototype._buildView = function (stream) {
        var view = this._createView();
        this._views[stream.articleId] = view;
        return view;
    };
    
    MultiView.prototype.switchTo = function (stream) {
        //TODO: Handle the case that someone uses switch to before adding anything
        if (stream.id != this._active.stream.id) {
            this._active.view.$el.hide();
            if (this._views[stream.articleId]) {
                this._startStream(stream);
            }
            else {
                this._startStream(stream, this._buildView(stream));
            }
            
           this._active.view.$el.siblings().each(function(){
              $(this).css("opacity", 0); 
           });
           this._active.view.$el.css("display", "block");
           var self = this;
           setTimeout(function() {self._active.view.$el.animate({opacity: 1.0}, 500);}, 1000);
           
           return this._active;
        }
    };
    
    MultiView.prototype.addStream = function (stream, start) {
        if (!this._views[stream.articleId]) {
            var view = this._buildView(stream);
            if (start) {
                this._startStream(stream, view);
            }
            else {
                this._queueStream(stream, view);
            }
            return this._active;
        }
    };
    
    return MultiView;
});
