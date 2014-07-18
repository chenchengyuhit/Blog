module.export = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJson('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 
			}
		}
	});
}